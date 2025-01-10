import { MessageBoxError } from "../messages.js";
import { Atomic } from "../state.js";
import { OverpassNode, OverpassWay } from "../types/overpass.js";
import { MergeData, MergeWay, MergeWayTags, MergeWayTagsIn } from "../types/processed.js";
import {
	inferJunction,
	inferLanes,
	inferLanesBackward,
	inferLanesForward,
	inferOneway,
	inferTurnLanesBackward,
	inferTurnLanesForward
} from "./inferences.js";

/**
 * Process {@link OverpassNode Nodes}, {@link OverpassWay Ways} and
 * {@link OverpassRelation Relations} into data the map can use to display.
 *
 * @param allNodes All {@link OverpassNode OverpassNodes} to process.
 * @param allWays All {@link OverpassWay OverpassWays} to process.
 * @returns The processed {@link MergeData}.
 */
export function process(allNodes: Map<number, OverpassNode>, allWays: Map<number, OverpassWay>) {
	const data: MergeData = new Map();

	for (const [id, way] of allWays) {
		// initial compilation of tag data, to be inferred
		const tagsRaw = way.tags;
		const tags: MergeWayTagsIn = {
			oneway: toBoolean(tagsRaw?.oneway),
			junction: tagsRaw?.junction,
			lanes: toNumber(tagsRaw?.lanes),
			lanesForward: toNumber(tagsRaw?.["lanes:forward"]),
			lanesBackward: toNumber(tagsRaw?.["lanes:backward"]),
			turnLanes: toDoubleArray(toArray(tagsRaw?.["turn:lanes"])),
			turnLanesForward: toDoubleArray(toArray(tagsRaw?.["turn:lanes:forward"])),
			turnLanesBackward: toDoubleArray(toArray(tagsRaw?.["turn:lanes:backward"])),
			surface: tagsRaw?.surface
		};

		if (way.id === 160292854) console.debug(tags);

		// infer data
		const changed = new Atomic(true);
		while (changed.get() === true) {
			changed.set(false);

			inferOneway(tags, changed);
			inferJunction(tags, changed);

			inferLanes(tags, changed);
			inferLanesForward(tags, changed);
			inferLanesBackward(tags, changed);

			inferTurnLanesForward(tags, changed);
			inferTurnLanesBackward(tags, changed);
		}

		// compile tags into way data
		const wayData: MergeWay = {
			nodes: allNodes,
			originalWay: way,
			orderedNodes: way.nodes,
			tags: {
				oneway: compile(tags, "oneway"),
				junction: compile(tags, "junction"),
				lanes: compile(tags, "lanes"),
				lanesForward: compile(tags, "lanesForward"),
				lanesBackward: compile(tags, "lanesBackward"),
				turnLanesForward: compile(tags, "turnLanesForward"),
				turnLanesBackward: compile(tags, "turnLanesBackward"),
				surface: compile(tags, "surface")
			},
			warnings: new Array(),
			inferences: new Set()
		};

		if (way.id === 160292854) console.debug(tags);

		data.set(id, wayData);
	}

	return data;
}

function compile<Tag extends keyof MergeWayTags, Value extends MergeWayTags[Tag]>(
	tags: Partial<MergeWayTags>,
	tag: Tag
): Value {
	const value = tags[tag];
	if (isNullish(value)) {
		console.debug(tags);
		throw new TagError(tag);
	}
	return value as Value;
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

// export function isValue(value: unknown): value is not

/**
 * Convert an OSM boolean string to a boolean.
 *
 * @param value The OSM string to convert.
 * @param fallback The value to set if {@link value} is `undefined`.
 * @returns The converted boolean.
 */
export function toBoolean(value?: string, fallback?: boolean) {
	switch (value) {
		case "yes":
			return true;
		case "no":
			return false;
		case undefined:
			return fallback;
	}
}

/**
 * Convert an OSM number string to a number.
 *
 * @param value The OSM string to convert.
 * @param fallback The value to set if {@link value} is `undefined`.
 * @returns The converted number.
 */
export function toNumber(value?: string, fallback?: number) {
	const number = Number(value);
	const isNumber = !isNaN(number);

	if (isNumber) return number;
	if (fallback !== undefined) return fallback;
}

/**
 * Convert an OSM array string to an array.
 *
 * @param value The OSM string to convert.
 * @param delimiter The OSM string delimiter to mark element boundaries.
 * @returns The converted array.
 */
export function toArray(value?: string, delimiter = "|") {
	return value?.split(delimiter).map(value => value || "none");
}

/**
 * Convert an OSM double-array to a double-array.
 *
 * @param array The double-array to convert.
 * @param delimiter The OSM string delimiter to mark element boundaries.
 * @returns The converted double-array.
 */
export function toDoubleArray(array?: Array<string>, delimiter = ";") {
	return array?.map(value => value.split(delimiter).map(value => value || "none"));
}

class TagError extends MessageBoxError {
	constructor(tag: string) {
		super(`Tag '${tag}' is missing and could not be inferred`);
	}
}
