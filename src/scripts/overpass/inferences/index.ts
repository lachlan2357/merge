import { Atomic } from "../../state/index.js";
import {
	OsmArray,
	OsmBoolean,
	OsmDoubleArray,
	OsmString,
	OsmUnsignedInteger
} from "../../types/osm.js";
import { MergeWayTag, MergeWayTags, MergeWayTagsIn } from "../../types/processed.js";
import { isEq, isSet } from "../process.js";
import { TagWarning, WarningMap } from "../warnings.js";
import { inferenceCreator } from "./creator.js";
import { noInference, noTransform, noValidation } from "./interfaces.js";

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
