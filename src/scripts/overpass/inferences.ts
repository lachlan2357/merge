import { Atomic } from "../state/index.js";
import { InferencesMade, MergeWayTags, MergeWayTagsIn } from "../types/processed.js";
import { isNullish } from "./process.js";

function inferenceCreator<Tag extends keyof MergeWayTags>(
	tag: Tag,
	processor: (tags: MergeWayTagsIn) => MergeWayTags[Tag] | undefined
) {
	return function (
		tags: MergeWayTagsIn,
		hasChanged: Atomic<boolean>,
		inferredTags: InferencesMade
	) {
		// ensure value doesn't already exist
		const oldValue = tags[tag];
		if (!isNullish(oldValue)) return;

		// try to infer value
		const newValue = processor(tags);
		if (newValue === undefined) return;
		if (oldValue === newValue) return;

		// make and record changes
		tags[tag] = newValue;
		inferredTags.add(tag);
		hasChanged.set(true);
	};
}

/**
 * Infer whether a way should be marked as one-way.
 *
 * @param tags The current state of the tags.
 * @param hasChanged State to change when a change has been made.
 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
 */
export const inferOneway = inferenceCreator("oneway", tags => {
	// lanes:backward === 0
	if (tags.lanesBackward === 0) return true;

	// default
	return false;
});

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
export const inferJunction = inferenceCreator("junction", () => {
	// default
	return "no";
});

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
export const inferSurface = inferenceCreator("surface", () => {
	// default
	return "unknown";
});

/**
 * Infer the total number of lanes.
 *
 * @param tags The current state of the tags.
 * @param hasChanged State to change when a change has been made.
 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
 */
export const inferLanes = inferenceCreator("lanes", tags => {
	// oneway === true && lanes:forward set
	if (tags.oneway === true && !isNullish(tags.lanesForward)) return tags.lanesForward;

	// oneway === false && lanes:forward set && lanes:backward set
	if (tags.oneway === false && !isNullish(tags.lanesForward) && !isNullish(tags.lanesBackward))
		return tags.lanesForward + tags.lanesBackward;

	// default
	return tags.oneway === true ? 1 : 2;
});

/**
 * Infer the number of forward-lanes.
 *
 * @param tags The current state of the tags.
 * @param hasChanged State to change when a change has been made.
 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
 */
export const inferLanesForward = inferenceCreator("lanesForward", tags => {
	// oneway === true && lanes:forward set
	if (tags.oneway === true && !isNullish(tags.lanes)) return tags.lanes;

	// oneway === false && tags.lanes set && tags.lanesBackwardSet
	if (tags.oneway === false && !isNullish(tags.lanes) && !isNullish(tags.lanesBackward))
		return tags.lanes - tags.lanesBackward;

	// fallback => oneway === false && tags.lanes % 2 === 0
	if (tags.oneway === false && !isNullish(tags.lanes) && tags.lanes % 2 === 0)
		return tags.lanes / 2;
});

/**
 * Infer the number of backward lanes.
 *
 * @param tags The current state of the tags.
 * @param hasChanged State to change when a change has been made.
 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
 */
export const inferLanesBackward = inferenceCreator("lanesBackward", tags => {
	// oneway === true
	if (tags.oneway === true) return 0;

	// oneway === false && tags.lanes set && tags.lanesForward set
	if (tags.oneway === false && !isNullish(tags.lanes) && !isNullish(tags.lanesForward))
		return tags.lanes - tags.lanesForward;

	// fallback => oneway === false && tags.lanes % 2 === 0
	if (tags.oneway === false && !isNullish(tags.lanes) && tags.lanes % 2 === 0)
		return tags.lanes / 2;
});

/**
 * Infer which forward lanes should have which turn lane road markings.
 *
 * @param tags The current state of the tags.
 * @param hasChanged State to change when a change has been made.
 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
 */
export const inferTurnLanesForward = inferenceCreator("turnLanesForward", tags => {
	// oneway === true && turn:lanes set
	if (tags.oneway === true && !isNullish(tags.turnLanes)) return tags.turnLanes;

	// fallback => lanes:forward set
	if (!isNullish(tags.lanesForward)) return new Array(tags.lanesForward).fill(new Array());
});

/**
 * Infer which backward lanes should have which turn lane road markings.
 *
 * @param tags The current state of the tags.
 * @param hasChanged State to change when a change has been made.
 * @param inferredTags Set of tags which have been inferred to add this tag to if changes are made.
 */
export const inferTurnLanesBackward = inferenceCreator("turnLanesBackward", tags => {
	// oneway === true
	if (tags.oneway === true) return new Array();

	// lanes:backward set
	if (!isNullish(tags.lanesBackward)) return new Array(tags.lanesBackward).fill(new Array());
});
