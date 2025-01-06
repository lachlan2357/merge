import { ImportedData, OverpassNode, OverpassWay, WayData } from "../types/overpass.js";

/**
 * Process {@link OverpassNode Nodes}, {@link OverpassWay Ways} and
 * {@link OverpassRelation Relations} into data the map can use to display.
 *
 * @param allNodes All {@link OverpassNode OverpassNodes} to process.
 * @param allWays All {@link OverpassWay OverpassWays} to process.
 * @returns The processed {@link ImportedData}.
 */
export function process(allNodes: Map<number, OverpassNode>, allWays: Map<number, OverpassWay>) {
	const waysInfo: ImportedData = new Map();
	allWays.forEach((way, id) => {
		const tags = way.tags;
		const wayData: WayData = {
			nodes: new Map(),
			originalWay: way,
			orderedNodes: way.nodes,
			tags: {
				oneway: toBoolean(tags?.oneway),
				junction: tags?.junction,
				lanes: toNumber(tags?.lanes),
				lanesForward: toNumber(tags?.["lanes:forward"]),
				lanesBackward: toNumber(tags?.["lanes:backward"]),
				turnLanes: toDoubleArray(toArray(tags?.["turn:lanes"])),
				turnLanesForward: toDoubleArray(toArray(tags?.["turn:lanes:forward"])),
				turnLanesBackward: toDoubleArray(toArray(tags?.["turn:lanes:backward"])),
				surface: tags?.surface
			},
			warnings: new Array(),
			inferences: new Set()
		};

		for (const id of way.nodes) {
			const node = allNodes.get(id);
			if (!node) continue;

			wayData.nodes.set(id, node);
		}

		// infer data
		let noChanges = false;
		while (!noChanges) {
			noChanges = true;
			const tags = wayData.tags;

			// lanes
			if (isNullish(tags.lanes) && !isNullish(tags.lanesForward)) {
				if (tags.oneway) {
					tags.lanes = tags.lanesForward;
					noChanges = false;
				} else if (!isNullish(tags.lanesBackward)) {
					tags.lanes = tags.lanesForward + tags.lanesBackward;
					noChanges = false;
				}
			}

			// lanes:forward
			if (isNullish(tags.lanesForward) && !isNullish(tags.lanes)) {
				if (tags.oneway) {
					tags.lanesForward = tags.lanes;
					noChanges = false;
				} else if (!isNullish(tags.lanesBackward)) {
					tags.lanesForward = tags.lanes - tags.lanesBackward;
					noChanges = false;
				} else if (!tags.oneway && tags.lanes % 2 === 0) {
					tags.lanesForward = tags.lanes / 2;
					noChanges = false;
				}
			}

			// lanes:backward
			if (isNullish(tags.lanesBackward)) {
				if (tags.oneway) {
					tags.lanesBackward = 0;
					noChanges = false;
				} else if (!isNullish(tags.lanes) && !isNullish(tags.lanesForward)) {
					tags.lanesBackward = tags.lanes - tags.lanesForward;
					noChanges = false;
				} else if (!isNullish(tags.lanes) && !(tags.lanes % 2)) {
					tags.lanesBackward = tags.lanes / 2;
					noChanges = false;
				}
			}

			// turn:lanes:forward
			if (isNullish(tags.turnLanesForward)) {
				if (tags.oneway && !isNullish(tags.turnLanes)) {
					tags.turnLanesForward = tags.turnLanes;
					noChanges = false;
				} else if (!isNullish(tags.lanesForward)) {
					tags.turnLanesForward = toDoubleArray(toArray("|".repeat(tags.lanesForward)));
					noChanges = false;
				}
			}

			// turn:lanes:backward
			if (isNullish(tags.turnLanesBackward) && !isNullish(tags.lanesBackward)) {
				tags.turnLanesBackward = toDoubleArray(toArray("|".repeat(tags.lanesBackward)));
				noChanges = false;
			}
		}

		waysInfo.set(id, wayData);
	});

	return waysInfo;
}

/**
 * Determine if a value is null-ish.
 *
 * A null-ish value is one that is either `null` or `undefined`.
 *
 * @param value The value to test.
 * @returns Whether the value is null-ish.
 */
export function isNullish(value: unknown): value is null | undefined {
	return value === null || value === undefined;
}

/**
 * Convert an OSM boolean string to a boolean.
 *
 * @param value The OSM string to convert.
 * @returns The converted boolean.
 */
function toBoolean(value?: string) {
	if (value) return value === "yes";
	else return undefined;
}

/**
 * Convert an OSM number string to a number.
 *
 * @param value The OSM string to convert.
 * @returns The converted number.
 */
function toNumber(value?: string) {
	const num = Number(value);
	if (!isNaN(num)) return num;
	else return undefined;
}

/**
 * Convert an OSM array string to an array.
 *
 * @param value The OSM string to convert.
 * @param delimiter The OSM string delimiter to mark element boundaries.
 * @returns The converted array.
 */
function toArray(value?: string, delimiter = "|") {
	return value?.split(delimiter).map(value => value || "none") ?? new Array<string>();
}

/**
 * Convert an OSM double-array to a double-array.
 *
 * @param array The double-array to convert.
 * @param delimiter The OSM string delimiter to mark element boundaries.
 * @returns The converted double-array.
 */
function toDoubleArray(array?: Array<string>, delimiter = ";") {
	return (
		array?.map(value => value.split(delimiter).map(value => value || "none")) ??
		new Array<Array<string>>()
	);
}
