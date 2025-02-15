import {
	OsmArray,
	OsmBoolean,
	OsmDoubleArray,
	OsmString,
	OsmUnsignedInteger
} from "../../types/osm.js";
import { MergeWayTag, MergeWayTags, MergeWayTagsIn } from "../../types/processed.js";
import { TagWarning, WarningMap } from "../warnings.js";
import { InferenceCollection } from "./collection.js";
import { InferenceBuilder } from "./builder.js";
import { InferenceGraph, Nodes } from "./graph.js";

/**
 * Perform all available {@link inferences} on {@link tags}.
 *
 * Inferences will be performed as specified under {@link InferenceCollection} on {@link tags}.
 *
 * @param tags The tags to perform inferences on.
 * @returns The tags which have been inferred.
 */
export function performInferences(tags: MergeWayTagsIn) {
	// const hasChanged = new Atomic(true);
	const inferredTags = new Set<MergeWayTag>();
	const inferences = new Set(Object.values(allInferences));

	// attempt to infer values
	const inferenceGraph = new InferenceGraph(ALL_CALCULATIONS);
	while (true) {
		// infer all possible calculations
		for (const node of inferenceGraph.nodes) {
			node.tryInfer(tags, inferredTags, inferenceGraph);
		}

		let found = false;
		guard: {
			// try infer a fallback until one is successful
			for (const infer of inferences) {
				for (const fallback of infer.fallbacks) {
					const success = fallback.tryInfer(tags, inferredTags);
					if (!success) continue;

					found = true;
					break guard;
				}
			}

			// try set a default until one is successful
			for (const infer of inferences) {
				const set = infer.setDefault(tags, inferredTags);
				if (!set) continue;

				found = true;
				break guard;
			}
		}

		// complete logical inferences if no more inferences could be made, otherwise try again
		if (!found) break;
	}

	// set defaults for values that could not be inferred
	for (const infer of inferences) infer.setDefault(tags, inferredTags);

	return inferredTags;
}

/**
 * Perform all available transforms on {@link tags}.
 *
 * @param tags The tags to perform transforms on.
 * @returns All warnings that arose from performing the transformation.
 */
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
	 * @param tag The tag to format.
	 * @param value The original value of the `turn:lanes` tag.
	 * @param tags The current state of the tags.
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
			InferenceBuilder.new("oneway")
				.assertIsEq("lanesBackward", 0)
				.setInferenceFn(() => new OsmBoolean(true))
		],
		[],
		new OsmBoolean(false),
		undefined,
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
		undefined,
		undefined
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
		undefined,
		undefined
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
			InferenceBuilder.new("lanes")
				.assertIsEq("oneway", true)
				.assertIsSet("lanesForward")
				.setInferenceFn(tags => tags.lanesForward),

			// oneway === false && lanes:forward set && lanes:backward set
			InferenceBuilder.new("lanes")
				.assertIsEq("oneway", false)
				.assertIsSet("lanesForward")
				.assertIsSet("lanesBackward")
				.setInferenceFn(tags => tags.lanesForward.add(tags.lanesBackward))
		],
		[
			// tags.oneway set
			InferenceBuilder.new("lanes")
				.assertIsSet("oneway")
				.setInferenceFn(tags => new OsmUnsignedInteger(tags.oneway.eq(true) ? 1 : 2))
		],
		new OsmUnsignedInteger(2),
		undefined,
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
			InferenceBuilder.new("lanesForward")
				.assertIsEq("oneway", true)
				.assertIsSet("lanes")
				.setInferenceFn(tags => tags.lanes),

			// oneway === false && lanes set && lanes:backward set
			InferenceBuilder.new("lanesForward")
				.assertIsEq("oneway", false)
				.assertIsSet("lanes")
				.assertIsSet("lanesBackward")
				.setInferenceFn(tags => tags.lanes.subtract(tags.lanesBackward))
		],
		[
			// oneway === false && lanes % 2 === 0
			InferenceBuilder.new("lanesForward")
				.assertIsEq("oneway", false)
				.assertThat("lanes", lanes => lanes.mod(2).eq(0))
				.setInferenceFn(tags => tags.lanes.divide(2))
		],
		new OsmUnsignedInteger(1),
		undefined,
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
			InferenceBuilder.new("lanesBackward")
				.assertIsEq("oneway", true)
				.setInferenceFn(() => new OsmUnsignedInteger(0)),

			// oneway === false && lanes set && lanes:forward set
			InferenceBuilder.new("lanesBackward")
				.assertIsEq("oneway", false)
				.assertIsSet("lanes")
				.assertIsSet("lanesForward")
				.setInferenceFn(tags => tags.lanes.subtract(tags.lanesForward))
		],
		[
			// oneway === false && lanes % 2 === 0
			InferenceBuilder.new("lanesBackward")
				.assertIsEq("oneway", false)
				.assertThat("lanes", lanes => lanes.mod(2).eq(0))
				.setInferenceFn(tags => tags.lanes.divide(2))
		],
		new OsmUnsignedInteger(1),
		undefined,
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
			InferenceBuilder.new("turnLanesForward")
				.assertIsEq("oneway", true)
				.assertIsSet("turnLanes")
				.setInferenceFn(tags => tags.turnLanes)
		],
		[
			// lanes:forward set
			InferenceBuilder.new("turnLanesForward")
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
			InferenceBuilder.new("turnLanesBackward")
				.assertIsEq("oneway", true)
				.setInferenceFn(() => new OsmDoubleArray([], OsmString))
		],
		[
			// lanes:backward set
			InferenceBuilder.new("turnLanesBackward")
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
} as const;

/**
 * Compiled array of all calculations specified in {@link allInferences}.
 */
const ALL_CALCULATIONS = Object.values(allInferences)
	.map<Nodes>(collection => collection.calculations)
	.flat();
