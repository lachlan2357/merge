import { Atomic } from "../state/index.js";
import {
	OsmArray,
	OsmBoolean,
	OsmDoubleArray,
	OsmString,
	OsmUnsignedInteger
} from "../types/osm.js";
import { InferencesMade, MergeWayTag, MergeWayTags, MergeWayTagsIn } from "../types/processed.js";
import { isEq, isSet } from "./process.js";
import { TagWarning, WarningMap } from "./warnings.js";

/**
 * Function signature for inference functions.
 */
type InferenceFn<Tag extends MergeWayTag> = (tag: MergeWayTagsIn) => MergeWayTags[Tag] | void;

/**
 * NOP function to be used when there are no inferences available for a tag.
 */
function noInference() {}

/**
 * Function signature for transform functions.
 */
type TransformFn<Tag extends MergeWayTag> = (
	tag: Tag,
	value: MergeWayTags[Tag],
	tags: MergeWayTags
) => MergeWayTags[Tag];

/**
 * NOP function to be used when there are no transforms available for a tag.
 */
function noTransform<Tag extends MergeWayTag>(
	_tag: Tag,
	value: MergeWayTags[Tag]
): MergeWayTags[Tag] {
	return value;
}

/**
 * Function signature for validation functions.
 */
type ValidationFn<Tag extends MergeWayTag> = (
	value: MergeWayTags[Tag],
	tags: MergeWayTags,
	warnings: Set<TagWarning>
) => void;

/**
 * NOP function to be used when there are no validations available for a tag.
 */
function noValidation() {}

/**
 * Collection of methods to perform inferences on a certain tag.
 */
export interface InferenceObject {
	/**
	 * The {@link MergeWayTag} this inference object is declared for.
	 */
	tag: MergeWayTag;

	/**
	 * Attempt to calculate the value for this tag based on other existing tags.
	 *
	 * Calculations will only be attempted if the value of the tag is unset. In the case where no
	 * inferences can be made, no changes will occur. In the case where changes are made however,
	 * {@link hasChanged} will be set to `true` and the tag being inferred will be added to
	 * {@link inferredTags}.
	 *
	 * @param tags The current state of the existing tags.
	 * @param hasChanged State value to set if changes are made in this method.
	 * @param inferredTags Set to keep track of tags which have had their values inferred.
	 */
	tryCalculate: (
		tags: MergeWayTagsIn,
		hasChanged: Atomic<boolean>,
		inferredTags: InferencesMade
	) => void;

	/**
	 * Attempt to fallback the value for this tag based on other existing tags.
	 *
	 * Fallbacks will only be attempted if the value of the tag is unset. In the case where no
	 * inferences can be made, no changes will occur. In the case where changes are made however,
	 * {@link hasChanged} will be set to `true` and the tag being inferred will be added to
	 * {@link inferredTags}.
	 *
	 * @param tags The current state of the existing tags.
	 * @param hasChanged State value to set if changes are made in this method.
	 * @param inferredTags Set to keep track of tags which have had their values inferred.
	 */
	tryFallback: (
		tags: MergeWayTagsIn,
		hasChanged: Atomic<boolean>,
		inferredTags: InferencesMade
	) => void;

	/**
	 * Default the value of this tag to its default value.
	 *
	 * The value will only defaulted if the tag is unset.
	 *
	 * @param tags The current state of the existing tags.
	 * @param inferredTags Set to keep track of tags which have had their values inferred.
	 */
	setDefault: (tags: MergeWayTagsIn, inferredTags: InferencesMade) => void;

	/**
	 * Format the value in this tag to be the most explicit representation of the data.
	 *
	 * @param tags The final values of all tags.
	 */
	formatValue: (tags: MergeWayTags) => void;

	/**
	 * Validate the current tag to ensure it makes sense in the context of all other tags.
	 *
	 * @param tags The final values of all tags.
	 * @param warnings Set to keep track of warnings for all tags.
	 */
	validateValue: (tags: MergeWayTags, warnings: Set<TagWarning>) => void;
}

/**
 * Define how a certain tag can be inferred.
 *
 * There are five stages to the inference process, where each stage is performed on all the tags
 * until no changes can be made, then the next stage is performed the same way on tags that remain
 * with no value. Finally, for any tags that still do not have a value, their corresponding default
 * value is set.
 *
 * The five stages of inference are:
 *
 * 1. {@link calculations} are computations that can be made for the value of a tag based on the
 * values of other tags. It is crucial that these inferences, if run on the same tags object, will
 * either infer the same value or not make an inference, as absolute precision is a requirement for
 * this level of inference.
 *
 * 2. {@link fallbacks} are instructions for how to create a default value based on the values of
 * other tags. Fallbacks do not have the strict requirement for being precise like calculations,
 * thus they should be ordered in descending order of desirability.
 *
 * 3. {@link default} is the final chance for a value to be set, indicating that a tag's value is
 * completely missing with no chance of any reasonably guess to what the value should be. These
 * values are not based on any data, acting as a pure default value.
 *
 * 4. {@link format} is designed to ensure the final tag's value is the most canonical version of
 * itself it can be. Sometimes, values for tags, or partial values in the case of arrays, can use
 * shortcuts in the way they are written to make it easier for mappers. The goal of format is to
 * reverse these changes to make it clearest what different values are referring to.
 *
 * 5. {@link validate} is used to check that the value makes sense in the context of all the other
 * tags. This is not the correct place to ensure values are "proper" (i.e., a surface is specified)
 * as a valid surface, these checks should be made in a class extending from {@link OsmValue},
 * restricting possible inner values to the "proper" ones.
 *
 * A tag must, at the very least, specify a default value, however may not specify a method for any
 * of the other stages if it is not applicable.
 *
 * Note: since each inference stage is completely separate, checks made in later stages cannot rely
 * on inferences made from earlier ones.
 *
 * @param tag The tag these inferences apply to.
 * @param calculations A method containing each calculation available for this tag.
 * @param fallbacks A method containing each fallback available for this tag.
 * @param defaultValue The value to set for this tag as a last resort.
 * @param format A method specifying how to properly format this tag.
 * @param validate A method specifying validations checks for this tag.
 */
function inferenceCreator<Tag extends MergeWayTag>(
	tag: Tag,
	calculations: InferenceFn<Tag>,
	fallbacks: InferenceFn<Tag>,
	defaultValue: MergeWayTags[Tag],
	format: TransformFn<Tag>,
	validate: ValidationFn<Tag>
): InferenceObject {
	const tryCalculate = (
		tags: MergeWayTagsIn,
		hasChanged: Atomic<boolean>,
		inferredTags: InferencesMade
	) => {
		// ensure value doesn't already exist
		const oldValue = tags[tag];
		if (isSet(oldValue)) return;

		// try to infer value
		const newValue = calculations(tags);
		if (newValue === undefined) return;

		// make and record changes
		tags[tag] = newValue;
		inferredTags.add(tag);
		hasChanged.set(true);
	};

	const tryFallback = (
		tags: MergeWayTagsIn,
		hasChanged: Atomic<boolean>,
		inferredTags: InferencesMade
	) => {
		// ensure value already hasn't been inferred
		const oldValue = tags[tag];
		if (isSet(oldValue)) return;

		// try to perform fallbacks
		const newValue = fallbacks(tags);
		if (newValue === undefined) return;

		// make and record changes
		tags[tag] = newValue;
		inferredTags.add(tag);
		hasChanged.set(true);
	};

	const setDefault = (tags: MergeWayTagsIn, inferredTags: InferencesMade) => {
		// ensure value already hasn't been inferred
		const oldValue = tags[tag];
		if (isSet(oldValue)) return;

		// make and record changes
		tags[tag] = defaultValue;
		inferredTags.add(tag);
	};

	const formatValue = (tags: MergeWayTags) => {
		// ensure tag value exists
		const value = tags[tag];

		// format value
		const formattedValue = format(tag, value, tags);
		if (formattedValue === undefined) return;
		tags[tag] = formattedValue;
	};

	const validateValue = (tags: MergeWayTags, warnings: Set<TagWarning>) => {
		const value = tags[tag];

		// validate value
		validate(value, tags, warnings);
	};

	return { tag, tryCalculate, tryFallback, setDefault, formatValue, validateValue };
}

/**
 * Perform all available {@link inferences} on {@link tags}.
 *
 * Inferences will be performed as specified under {@link inferenceCreator()} on {@link tags}.
 *
 * @param tags The tags to perform inferences on.
 * @param inferences The inferences to perform.
 * @returns The tags which have been inferred.
 */
export function performInferences(tags: MergeWayTagsIn) {
	const hasChanged = new Atomic(true);
	const inferredTags = new Set<MergeWayTag>();
	const inferences = new Set(Object.values(allInferences));

	// perform calculations
	do {
		hasChanged.set(false);
		for (const infer of inferences) infer.tryCalculate(tags, hasChanged, inferredTags);
	} while (hasChanged.get() === true);

	// perform fallbacks
	do {
		hasChanged.set(false);
		for (const obj of inferences) obj.tryFallback(tags, hasChanged, inferredTags);
	} while (hasChanged.get() === true);

	// set defaults
	for (const obj of inferences) obj.setDefault(tags, inferredTags);

	return inferredTags;
}

export function performTransforms(tags: MergeWayTags): WarningMap {
	const warningMap = new Map<MergeWayTag, Set<TagWarning>>();
	const inferences = new Set(Object.values(allInferences));

	// format values
	for (const obj of inferences) obj.formatValue(tags);

	// validate values
	for (const obj of inferences) {
		const warnings = new Set<TagWarning>();
		obj.validateValue(tags, warnings);

		if (warnings.size > 0) warningMap.set(obj.tag, warnings);
	}

	return warningMap;
}

/**
 * All available formatters to be used by various tags.
 */
const formatters = {
	/**
	 * Format a `turn:lanes`, `turn:lanes:*` tag value.
	 *
	 * @param value The original value of the `turn:lanes` tag.
	 * @returns The formatted value of the `turn:lanes` tag.
	 */
	turnLanes(
		tag: MergeWayTag,
		value: OsmDoubleArray<OsmString>,
		tags: MergeWayTags
	): OsmDoubleArray<OsmString> {
		// ensure formatter is applicable to this tag
		if (!(tag === "turnLanesForward" || tag === "turnLanesBackward")) return value;

		// add missing lanes to turn:lanes
		const numLanesObj = tag === "turnLanesForward" ? tags.lanesForward : tags.lanesBackward;
		const numLanes = numLanesObj.get();
		while (value.length < numLanes) value.push(new OsmArray(new Array(), OsmString));

		// convert implicit nones (empty element) to explicit nones "none"
		return value.map(array => {
			if (array.length === 0) array.push(new OsmString(""));
			return array.map(value => (value.eq("") ? new OsmString("none") : value), OsmString);
		}, OsmString);
	}
};

/**
 * All available inferences to use when compiling tags.
 */
const allInferences = {
	/**
	 * Infer whether a way should be marked as one-way.
	 *
	 * @param tags The current state of the tags.
	 * @param hasChanged State to change when a change has been made.
	 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
	 */
	inferOneway: inferenceCreator(
		"oneway",
		tags => {
			// lanes:backward === 0
			if (isEq(tags.lanesBackward, 0)) return OsmBoolean.TRUE;
		},
		noInference,
		OsmBoolean.FALSE,
		noTransform<"oneway">,
		(oneway, tags, warnings) => {
			// oneway === true && lanes:backward !== 0
			if (oneway.eq(true) && !tags.lanesBackward.eq(0))
				warnings.add(TagWarning.onewayWithBackwardLanes(tags.lanesBackward));

			// oneway === false && lanes:backward === 0
			if (oneway.eq(false) && tags.lanesBackward.eq(0))
				warnings.add(TagWarning.notOnewayWithNoBackwardLanes());
		}
	),

	/**
	 * Infer whether a junction is present.
	 *
	 * Note: there is no way to infer the value of `junction` to be anything other than `no`. Thus, if
	 * the `junction` tag is missing, it will be defaulted to `no`.
	 *
	 * @param tags The current state of the tags.
	 * @param hasChanged State to change when a change has been made.
	 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
	 */
	inferJunction: inferenceCreator(
		"junction",
		() => {},
		() => {},
		new OsmString("no"),
		noTransform<"junction">,
		noValidation
	),

	/**
	 * Infer whether a surface is present.
	 *
	 * Note: there is no way to infer the value of `surface` to be anything other than its initial
	 * value or `unknown`. Thus, if the `surface` tag is missing, it will be defaulted to `unknown`.
	 *
	 * @param tags The current state of the tags.
	 * @param hasChanged State to change when a change has been made.
	 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
	 */
	inferSurface: inferenceCreator(
		"surface",
		() => {},
		() => {},
		new OsmString("unknown"),
		noTransform<"surface">,
		noValidation
	),

	/**
	 * Infer the total number of lanes.
	 *
	 * @param tags The current state of the tags.
	 * @param hasChanged State to change when a change has been made.
	 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
	 */
	inferLanes: inferenceCreator(
		"lanes",
		tags => {
			// oneway === true && lanes:forward set
			if (isEq(tags.oneway, true) && isSet(tags.lanesForward)) return tags.lanesForward;

			// oneway === false && lanes:forward set && lanes:backward set
			if (isEq(tags.oneway, false) && isSet(tags.lanesForward) && isSet(tags.lanesBackward))
				return tags.lanesForward.add(tags.lanesBackward);
		},
		tags => {
			// tags.oneway set
			if (isSet(tags)) return new OsmUnsignedInteger(tags.oneway ? 1 : 2);
		},
		new OsmUnsignedInteger(2),
		noTransform<"lanes">,
		(lanes, tags, warnings) => {
			// lanes === 0
			if (lanes.eq(0)) warnings.add(TagWarning.lanesEqualZero("lanes"));

			// lanes !== lanes:forward + lanes:backward
			if (!lanes.eq(tags.lanesForward.add(tags.lanesBackward)))
				warnings.add(
					TagWarning.lanesUnequalToForwardBackward(
						lanes,
						tags.lanesForward,
						tags.lanesBackward
					)
				);
		}
	),

	/**
	 * Infer the number of forward-lanes.
	 *
	 * @param tags The current state of the tags.
	 * @param hasChanged State to change when a change has been made.
	 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
	 */
	inferLanesForward: inferenceCreator(
		"lanesForward",
		tags => {
			// oneway === true && lanes:forward set
			if (isEq(tags.oneway, true) && isSet(tags.lanes)) return tags.lanes;

			// oneway === false && tags.lanes set && tags.lanesBackwardSet
			if (isEq(tags.oneway, false) && isSet(tags.lanes) && isSet(tags.lanesBackward))
				return tags.lanes.subtract(tags.lanesBackward);
		},
		tags => {
			// oneway === false && tags.lanes % 2 === 0
			if (isEq(tags.oneway, false) && isSet(tags.lanes) && isEq(tags.lanes.mod(2), 0))
				return tags.lanes?.divide(2);
		},
		new OsmUnsignedInteger(1),
		noTransform<"lanesForward">,
		(lanesForward, tags, warnings) => {
			// lanes:forward === 0
			if (lanesForward.eq(0)) warnings.add(TagWarning.lanesEqualZero("lanesForward"));
		}
	),

	/**
	 * Infer the number of backward lanes.
	 *
	 * @param tags The current state of the tags.
	 * @param hasChanged State to change when a change has been made.
	 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
	 */
	inferLanesBackward: inferenceCreator(
		"lanesBackward",
		tags => {
			// oneway === true
			if (isEq(tags.oneway, true)) return new OsmUnsignedInteger(0);

			// oneway === false && tags.lanes set && tags.lanesForward set
			if (isEq(tags.oneway, false) && isSet(tags.lanes) && isSet(tags.lanesForward))
				return tags.lanes.subtract(tags.lanesForward);
		},
		tags => {
			// oneway === false && tags.lanes % 2 === 0
			if (isEq(tags.oneway, false) && isSet(tags.lanes) && isEq(tags.lanes.mod(2), 0))
				return tags.lanes.divide(2);
		},
		new OsmUnsignedInteger(1),
		noTransform<"lanesBackward">,
		(lanesBackward, tags, warnings) => {
			// oneway === true && lanes:backward !== 0
			if (tags.oneway.eq(true) && !lanesBackward.eq(0))
				warnings.add(TagWarning.onewayWithBackwardLanes(tags.lanesBackward));

			// oneway === false && lanes:backward === 0
			if (tags.oneway.eq(false) && lanesBackward.eq(0))
				warnings.add(TagWarning.notOnewayWithNoBackwardLanes());
		}
	),

	/**
	 * Infer which forward lanes should have which turn lane road markings.
	 *
	 * @param tags The current state of the tags.
	 * @param hasChanged State to change when a change has been made.
	 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
	 */
	inferTurnLanesForward: inferenceCreator(
		"turnLanesForward",
		tags => {
			// oneway === true && turn:lanes set
			if (isEq(tags.oneway, true) && isSet(tags.turnLanes)) return tags.turnLanes;
		},
		tags => {
			// lanes:forward set
			if (isSet(tags.lanesForward)) return new OsmDoubleArray("", OsmString);
		},
		new OsmDoubleArray("", OsmString),
		formatters.turnLanes,
		(turnLanesForward, tags, warnings) => {
			// length turn:lanes:forward !== lanes:forward
			if (!tags.lanesForward.eq(turnLanesForward.length))
				warnings.add(
					TagWarning.turnLanesUnequalToLanes(
						"turnLanesForward",
						turnLanesForward.length,
						"lanesForward",
						tags.lanesForward
					)
				);
		}
	),

	/**
	 * Infer which backward lanes should have which turn lane road markings.
	 *
	 * @param tags The current state of the tags.
	 * @param hasChanged State to change when a change has been made.
	 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
	 */
	inferTurnLanesBackward: inferenceCreator(
		"turnLanesBackward",
		tags => {
			// oneway === true
			if (isEq(tags.oneway, true)) return new OsmDoubleArray(new Array(), OsmString);
		},
		tags => {
			// lanes:backward set
			if (isSet(tags.lanesBackward))
				return new OsmDoubleArray(
					new Array(tags.lanesBackward.get()).fill(new OsmArray("", OsmString)),
					OsmString
				);
		},
		new OsmDoubleArray(new Array(), OsmString),
		formatters.turnLanes,
		(turnLanesBackward, tags, warnings) => {
			// length turn:lanes:backward !== lanes:backward
			if (!tags.lanesBackward.eq(turnLanesBackward.length))
				warnings.add(
					TagWarning.turnLanesUnequalToLanes(
						"turnLanesBackward",
						turnLanesBackward.length,
						"lanesBackward",
						tags.lanesBackward
					)
				);
		}
	)
};
