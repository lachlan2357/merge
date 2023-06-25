import type {
	ImportedData,
	OverpassNode,
	OverpassWay,
	WayData
} from "./index.js";
import { togglePopup } from "./supplement/dom.js";
import { nullish } from "./supplement/index.js";
import { array, bool, dArray, number } from "./supplement/overpass.js";
import { Settings } from "./supplement/settings.js";
import { data } from "./supplement/view.js";

export const settings = new Settings();

export function process(
	allWays: Map<number, OverpassWay>,
	allNodes: Map<number, OverpassNode>
) {
	const waysInfo: ImportedData = new Map();
	allWays.forEach((way, id) => {
		const tags = way.tags;
		const wayData: WayData = {
			nodes: new Map(),
			originalWay: way,
			orderedNodes: way.nodes,
			tags: {
				oneway: bool(tags.oneway),
				junction: tags.junction,
				lanes: number(tags.lanes),
				lanesForward: number(tags["lanes:forward"]),
				lanesBackward: number(tags["lanes:backward"]),
				turnLanes: dArray(array(tags["turn:lanes"], "none"), "none"),
				turnLanesForward: dArray(array(tags["turn:lanes:forward"])),
				turnLanesBackward: dArray(array(tags["turn:lanes:backward"])),
				surface: tags.surface
			},
			warnings: [],
			inferences: new Set()
		};

		way.nodes.forEach(id => {
			const node = allNodes.get(id);
			if (!node) return;
			wayData.nodes.set(id, node);
		});

		// infer data
		let noChanges = false;
		while (!noChanges) {
			noChanges = true;
			const tags = wayData.tags;

			// lanes
			if (nullish(tags.lanes) && !nullish(tags.lanesForward)) {
				if (tags.oneway) {
					tags.lanes = tags.lanesForward;
					noChanges = false;
				} else if (!nullish(tags.lanesBackward)) {
					tags.lanes = tags.lanesForward + tags.lanesBackward;
					noChanges = false;
				}
			}

			// lanes:forward
			if (nullish(tags.lanesForward) && !nullish(tags.lanes)) {
				if (tags.oneway) {
					tags.lanesForward = tags.lanes;
					noChanges = false;
				} else if (!nullish(tags.lanesBackward)) {
					tags.lanesForward = tags.lanes - tags.lanesBackward;
					noChanges = false;
				} else if (!tags.oneway && tags.lanes % 2 === 0) {
					tags.lanesForward = tags.lanes / 2;
					noChanges = false;
				}
			}

			// lanes:backward
			if (nullish(tags.lanesBackward)) {
				if (tags.oneway) {
					tags.lanesBackward = 0;
					noChanges = false;
				} else if (
					!nullish(tags.lanes) &&
					!nullish(tags.lanesForward)
				) {
					tags.lanesBackward = tags.lanes - tags.lanesForward;
					noChanges = false;
				} else if (!nullish(tags.lanes) && !(tags.lanes % 2)) {
					tags.lanesBackward = tags.lanes / 2;
					noChanges = false;
				}
			}

			// turn:lanes:forward
			if (nullish(tags.turnLanesForward)) {
				if (tags.oneway && !nullish(tags.turnLanes)) {
					tags.turnLanesForward = tags.turnLanes;
					noChanges = false;
				} else if (!nullish(tags.lanesForward)) {
					tags.turnLanesForward = dArray(
						array("|".repeat(tags.lanesForward))
					);
					noChanges = false;
				}
			}

			// turn:lanes:backward
			if (
				nullish(tags.turnLanesBackward) &&
				!nullish(tags.lanesBackward)
			) {
				tags.turnLanesBackward = dArray(
					array("|".repeat(tags.lanesBackward))
				);
				noChanges = false;
			}
		}

		waysInfo.set(id, wayData);
	});

	data.set(waysInfo);
}

// show first launch popup if first launch
if (settings.get("firstLaunch")) {
	settings.set("firstLaunch", false);
	togglePopup("welcome");
}
