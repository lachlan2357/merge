import { OsmUnsignedInteger } from "./osm-values.js";
import { MergeWayTag } from "./structures-processed.js";

/** Warning messages for when validation of a tag's value fails. */
export class TagWarning extends Error {
	/**
	 * Warning for when `oneway = true` is matched with `lanes:backward > 0`.
	 *
	 * @param numLanes The number of backward lanes.
	 * @returns The warning.
	 */
	static onewayWithBackwardLanes(numLanes: OsmUnsignedInteger) {
		return new TagWarning(
			`Way is set as 'oneway' while also specifying '${numLanes}' backward lanes.`
		);
	}

	/**
	 * Warning for when `oneway = false` is matched with `lanes:backward = 0`.
	 *
	 * @returns The warning.
	 */
	static notOnewayWithNoBackwardLanes() {
		return new TagWarning(`Way is not set as 'oneway' while having no backward lanes.`);
	}

	/**
	 * Warning for when `lanes = 0`.
	 *
	 * @param tag The tag which has zero lanes set.
	 * @returns The warning.
	 */
	static lanesEqualZero(tag: MergeWayTag) {
		return new TagWarning(`Way has 0 '${tag}' specified.`);
	}

	/**
	 * Warning for when `lanes != lanes:forward + lanes:backward`.
	 *
	 * @param lanes The number of total lanes.
	 * @param lanesForward The number of forward lanes.
	 * @param lanesBackward The number of backward lanes.
	 * @returns The warning.
	 */
	static lanesUnequalToForwardBackward(
		lanes: OsmUnsignedInteger,
		lanesForward: OsmUnsignedInteger,
		lanesBackward: OsmUnsignedInteger
	) {
		return new TagWarning(
			`Way has '${lanes}' lanes specified, however forward and backward lanes total to '${lanesForward.add(lanesBackward)}'.`
		);
	}

	/**
	 * Warning for when the number of lanes under `turn:lanes:*` is not the same as the number of
	 * `lanes:*`.
	 *
	 * @param turnLanesTag The specific `turn:lanes:*` tag.
	 * @param turnLanesNumber The number of lanes specified under `turn:lanes:*`.
	 * @param lanesTag The specific `lanes:*` tag.
	 * @param lanesNumber The number of lanes specified under `lanes:*`.
	 * @returns The warning.
	 */
	static turnLanesUnequalToLanes(
		turnLanesTag: MergeWayTag,
		turnLanesNumber: number,
		lanesTag: MergeWayTag,
		lanesNumber: OsmUnsignedInteger
	) {
		return new TagWarning(
			`'${lanesTag}' specifies '${lanesNumber}' lanes, however '${turnLanesTag}' specifies '${turnLanesNumber}' lanes.`
		);
	}
}

/** Alias for a map of each way's warnings. */
export type WarningMap = Map<MergeWayTag, Set<TagWarning>>;
