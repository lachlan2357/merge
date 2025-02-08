import { Atomic } from "../../state/index.js";
import {
	OsmArray,
	OsmBoolean,
	OsmDoubleArray,
	OsmString,
	OsmUnsignedInteger
} from "../../types/osm.js";
import { MergeWayTag, MergeWayTags, MergeWayTagsIn } from "../../types/processed.js";
import { TagWarning, WarningMap } from "../warnings.js";
import { InferenceCollection } from "./creator.js";
import { InferenceDsl } from "./dsl.js";
import { noTransform, noValidation } from "./interfaces.js";

/**
 * Perform all available {@link inferences} on {@link tags}.
 *
 * Inferences will be performed as specified under {@link InferenceCollection} on {@link tags}.
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
	inferOneway: new InferenceCollection(
		"oneway",
		[
			// lanes:backward === 0
			InferenceDsl.new("oneway")
				.assertIsEq("lanesBackward", 0)
				.setInferenceFn(() => new OsmBoolean(true))
		],
		[],
		new OsmBoolean(false),
		noTransform<"oneway">,
		(oneway, { lanesBackward }, warnings) => {
			// oneway === true && lanes:backward !== 0
			if (oneway.eq(true) && !lanesBackward.eq(0))
				warnings.add(TagWarning.onewayWithBackwardLanes(lanesBackward));

			// oneway === false && lanes:backward === 0
			if (oneway.eq(false) && lanesBackward.eq(0))
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
	inferJunction: new InferenceCollection(
		"junction",
		[],
		[],
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
	inferSurface: new InferenceCollection(
		"surface",
		[],
		[],
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
	inferLanes: new InferenceCollection(
		"lanes",
		[
			// oneway === true && lanes:forward set
			InferenceDsl.new("lanes")
				.assertIsEq("oneway", true)
				.assertIsSet("lanesForward")
				.setInferenceFn(tags => tags.lanesForward),

			// oneway === false && lanes:forward set && lanes:backward set
			InferenceDsl.new("lanes")
				.assertIsEq("oneway", false)
				.assertIsSet("lanesForward")
				.assertIsSet("lanesBackward")
				.setInferenceFn(tags => tags.lanesForward.add(tags.lanesBackward))
		],
		[
			// tags.oneway set
			InferenceDsl.new("lanes")
				.assertIsSet("oneway")
				.setInferenceFn(tags => new OsmUnsignedInteger(tags.oneway.eq(true) ? 1 : 2))
		],
		new OsmUnsignedInteger(2),
		noTransform<"lanes">,
		(lanes, { lanesForward, lanesBackward }, warnings) => {
			// lanes === 0
			if (lanes.eq(0)) warnings.add(TagWarning.lanesEqualZero("lanes"));

			// lanes !== lanes:forward + lanes:backward
			if (!lanes.eq(lanesForward.add(lanesBackward)))
				warnings.add(
					TagWarning.lanesUnequalToForwardBackward(lanes, lanesForward, lanesBackward)
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
	inferLanesForward: new InferenceCollection(
		"lanesForward",
		[
			// oneway === true && lanes set
			InferenceDsl.new("lanesForward")
				.assertIsEq("oneway", true)
				.assertIsSet("lanes")
				.setInferenceFn(tags => tags.lanes),

			// oneway === false && lanes set && lanes:backward set
			InferenceDsl.new("lanesForward")
				.assertIsEq("oneway", false)
				.assertIsSet("lanes")
				.assertIsSet("lanesBackward")
				.setInferenceFn(tags => tags.lanes.subtract(tags.lanesBackward))
		],
		[
			// oneway === false && lanes % 2 === 0
			InferenceDsl.new("lanesForward")
				.assertIsEq("oneway", false)
				.assertIs("lanes", lanes => lanes.mod(2).eq(0))
				.setInferenceFn(tags => tags.lanes.divide(2))
		],
		new OsmUnsignedInteger(1),
		noTransform<"lanesForward">,
		(lanesForward, _tags, warnings) => {
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
	inferLanesBackward: new InferenceCollection(
		"lanesBackward",
		[
			// oneway === true
			InferenceDsl.new("lanesBackward")
				.assertIsEq("oneway", true)
				.setInferenceFn(() => new OsmUnsignedInteger(0)),

			// oneway === false && lanes set && lanes:forward set
			InferenceDsl.new("lanesBackward")
				.assertIsEq("oneway", false)
				.assertIsSet("lanes")
				.assertIsSet("lanesForward")
				.setInferenceFn(tags => tags.lanes.subtract(tags.lanesForward))
		],
		[
			// oneway === false && lanes % 2 === 0
			InferenceDsl.new("lanesBackward")
				.assertIsEq("oneway", false)
				.assertIs("lanes", lanes => lanes.mod(2).eq(0))
				.setInferenceFn(tags => tags.lanes.divide(2))
		],
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
	inferTurnLanesForward: new InferenceCollection(
		"turnLanesForward",
		[
			// oneway === true && turn:lanes set
			InferenceDsl.new("turnLanesForward")
				.assertIsEq("oneway", true)
				.assertIsSet("turnLanes")
				.setInferenceFn(tags => tags.turnLanes)
		],
		[
			// lanes:forward set
			InferenceDsl.new("turnLanesForward")
				.assertIsSet("lanesForward")
				.setInferenceFn(tags =>
					OsmDoubleArray.ofLength(tags.lanesForward.get(), "", OsmString)
				)
		],
		new OsmDoubleArray([], OsmString),
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
	inferTurnLanesBackward: new InferenceCollection(
		"turnLanesBackward",
		[
			// oneway === true
			InferenceDsl.new("turnLanesBackward")
				.assertIsEq("oneway", true)
				.setInferenceFn(() => new OsmDoubleArray([], OsmString))
		],
		[
			// lanes:backward set
			InferenceDsl.new("turnLanesBackward")
				.assertIsSet("lanesBackward")
				.setInferenceFn(tags =>
					OsmDoubleArray.ofLength(tags.lanesBackward.get(), "", OsmString)
				)
		],
		new OsmDoubleArray([], OsmString),
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
