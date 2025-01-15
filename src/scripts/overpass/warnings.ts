import { OsmUnsignedInteger } from "../types/osm.js";
import { MergeWayTag } from "../types/processed.js";

export class TagWarning extends Error {
	static onewayWithBackwardLanes(numLanes: OsmUnsignedInteger) {
		return new TagWarning(
			`Way is set as 'oneway' while also specifying '${numLanes}' backward lanes.`
		);
	}

	static notOnewayWithNoBackwardLanes() {
		return new TagWarning(`Way is not set as 'oneway' while having no backward lanes.`);
	}

	static lanesEqualZero(tag: MergeWayTag) {
		return new TagWarning(`Way has 0 '${tag}' specified.`);
	}

	static lanesUnequalToForwardBackward(
		lanes: OsmUnsignedInteger,
		lanesForward: OsmUnsignedInteger,
		lanesBackward: OsmUnsignedInteger
	) {
		return new TagWarning(
			`Way has '${lanes}' lanes specified, however forward and backward lanes total to '${lanesForward.add(lanesBackward)}'.`
		);
	}

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

export type WarningMap = Map<MergeWayTag, Set<TagWarning>>;
