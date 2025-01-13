import { toDoubleArray } from "./conversions.js";
import { isNullish } from "./process.js";
/**
 * Infer whether a way should be marked as one-way.
 *
 * @param tags The current state of the tags.
 * @param changed State to change when a change has been made.
 */
export function inferOneway(tags, changed) {
    if (!isNullish(tags.oneway))
        return;
    // lanes:backward === 0
    if (tags.lanesBackward === 0) {
        tags.oneway = true;
        return changed.set(true);
    }
    tags.oneway = false;
    changed.set(true);
}
/**
 * Infer whether a junction is present.
 *
 * Note: there is no way to infer the value of `junction` to be anything other than `no`. Thus, if
 * the `junction` tag is missing, it will be defaulted to `no`.
 *
 * @param tags The current state of the tags.
 * @param changed State to change when a change has been made.
 */
export function inferJunction(tags, changed) {
    if (!isNullish(tags.junction))
        return;
    tags.junction = "no";
    changed.set(true);
}
/**
 * Infer the total number of lanes.
 *
 * @param tags The current state of the tags.
 * @param changed State to change when a change has been made.
 */
export function inferLanes(tags, changed) {
    if (!isNullish(tags.lanes))
        return;
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
/**
 * Infer the number of forward-lanes.
 *
 * @param tags The current state of the tags.
 * @param changed State to change when a change has been made.
 */
export function inferLanesForward(tags, changed) {
    if (!isNullish(tags.lanesForward))
        return;
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
/**
 * Infer the number of backward lanes.
 *
 * @param tags The current state of the tags.
 * @param changed State to change when a change has been made.
 */
export function inferLanesBackward(tags, changed) {
    if (!isNullish(tags.lanesBackward))
        return;
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
/**
 * Infer which forward lanes should have which turn lane road markings.
 *
 * @param tags The current state of the tags.
 * @param changed State to change when a change has been made.
 */
export function inferTurnLanesForward(tags, changed) {
    if (!isNullish(tags.turnLanesForward))
        return;
    // oneway === true && turn:lanes set
    if (tags.oneway === true && !isNullish(tags.turnLanes)) {
        tags.turnLanesForward = tags.turnLanes;
        return changed.set(true);
    }
    // lanes:forward set
    if (!isNullish(tags.lanesForward) && tags.lanesForward > 0) {
        if (tags.lanesForward === 0) {
            tags.turnLanesForward = new Array();
            return changed.set(true);
        }
        const turnLanesForwardString = "|".repeat(tags.lanesForward - 1);
        tags.turnLanesForward = toDoubleArray(turnLanesForwardString);
        return changed.set(true);
    }
}
/**
 * Infer which backward lanes should have which turn lane road markings.
 *
 * @param tags The current state of the tags.
 * @param changed State to change when a change has been made.
 */
export function inferTurnLanesBackward(tags, changed) {
    if (!isNullish(tags.turnLanesBackward))
        return;
    // lanes:backward set
    if (!isNullish(tags.lanesBackward)) {
        if (tags.lanesBackward === 0) {
            tags.turnLanesBackward = new Array();
            return changed.set(true);
        }
        const turnLanesBackwardString = "|".repeat(tags.lanesBackward - 1);
        tags.turnLanesBackward = toDoubleArray(turnLanesBackwardString);
        return changed.set(true);
    }
}
/**
 * Infer whether a surface is present.
 *
 * Note: there is no way to infer the value of `surface` to be anything other than its initial
 * value or `unknown`. Thus, if the `surface` tag is missing, it will be defaulted to `unknown`.
 *
 * @param tags The current state of the tags.
 * @param changed State to change when a change has been made.
 */
export function inferSurface(tags, changed) {
    if (!isNullish(tags.surface))
        return;
    tags.surface = "unknown";
    changed.set(true);
}