import { Atomic } from "../state.js";
import { MergeWayTagsIn } from "../types/processed.js";
import { isNullish, toArray, toDoubleArray } from "./process.js";

export function inferOneway(tags: MergeWayTagsIn, changed: Atomic<boolean>) {
	if (!isNullish(tags.oneway)) return;

	tags.oneway = false;
	changed.set(true);
}

export function inferJunction(tags: MergeWayTagsIn, changed: Atomic<boolean>) {
	if (!isNullish(tags.junction)) return;

	tags.junction = "none";
	changed.set(true);
}

export function inferLanes(tags: MergeWayTagsIn, changed: Atomic<boolean>) {
	if (!isNullish(tags.lanes)) return;

	// oneway === true && lanes:forward set
	if (tags.oneway === true && !isNullish(tags.lanesForward)) {
		tags.lanes = tags.lanesForward;
		return changed.set(true);
	}

	// oneway === false && lanes:forward set && lanes:backward set
	if (tags.oneway === false && !isNullish(tags.lanesForward) && !isNullish(tags.lanesBackward)) {
		tags.lanes = tags.lanesForward + tags.lanesBackward;
		return changed.set(true);
	}

	// oneway set
	if (!isNullish(tags.oneway)) {
		tags.lanes = tags.oneway ? 1 : 2;
		return changed.set(true);
	}
}

export function inferLanesForward(tags: MergeWayTagsIn, changed: Atomic<boolean>) {
	if (!isNullish(tags.lanesForward)) return;

	// oneway === true
	if (tags.oneway === true) {
		tags.lanesForward = tags.lanes ?? 1;
		return changed.set(true);
	}

	// oneway === false && tags.lanes set && tags.lanesBackward set
	if (tags.oneway === false && !isNullish(tags.lanes) && !isNullish(tags.lanesBackward)) {
		tags.lanesForward = tags.lanes - tags.lanesBackward;
		return changed.set(true);
	}

	// oneway === false %% tags.lanes % 2 === 0
	if (tags.oneway === false && !isNullish(tags.lanes) && tags.lanes % 2 === 0) {
		tags.lanesForward = tags.lanes / 2;
		return changed.set(true);
	}
}

export function inferLanesBackward(tags: MergeWayTagsIn, changed: Atomic<boolean>) {
	if (!isNullish(tags.lanesBackward)) return;

	// oneway === true
	if (tags.oneway === true) {
		tags.lanesBackward = 0;
		return changed.set(true);
	}

	// oneway === false && tags.lanes set && tags.lanesForward set
	if (tags.oneway === false && !isNullish(tags.lanes) && !isNullish(tags.lanesForward)) {
		tags.lanesBackward = tags.lanes - tags.lanesForward;
		return changed.set(true);
	}

	// oneway === false && tags.lanes % 2 === 0
	if (tags.oneway === false && !isNullish(tags.lanes) && tags.lanes % 2 === 0) {
		tags.lanesBackward = tags.lanes / 2;
		return changed.set(true);
	}
}

export function inferTurnLanesForward(tags: MergeWayTagsIn, changed: Atomic<boolean>) {
	if (!isNullish(tags.turnLanesForward)) return;

	// oneway === true && turn:lanes set
	if (tags.oneway === true && !isNullish(tags.turnLanes)) {
		tags.turnLanesForward = tags.turnLanes;
		console.debug("set to", tags.turnLanesForward, "using first");
		return changed.set(true);
	}

	// lanes:forward set
	if (!isNullish(tags.lanesForward) && tags.lanesForward > 0) {
		if (tags.lanesForward === 0) {
			tags.turnLanesForward = new Array();
			return changed.set(true);
		}

		const turnLanesForwardString = "|".repeat(tags.lanesForward - 1);
		tags.turnLanesForward = toDoubleArray(toArray(turnLanesForwardString));
		return changed.set(true);
	}
}

export function inferTurnLanesBackward(tags: MergeWayTagsIn, changed: Atomic<boolean>) {
	if (!isNullish(tags.turnLanesBackward)) return;

	// lanes:backward set
	if (!isNullish(tags.lanesBackward)) {
		if (tags.lanesBackward === 0) {
			tags.turnLanesBackward = new Array();
			return changed.set(true);
		}

		const turnLanesBackwardString = "|".repeat(tags.lanesBackward - 1);
		tags.turnLanesBackward = toDoubleArray(toArray(turnLanesBackwardString));
		return changed.set(true);
	}
}
