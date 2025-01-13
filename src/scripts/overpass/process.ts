import { MessageBoxError } from "../messages.js";
import { Atomic } from "../state/index.js";
import { OverpassNode, OverpassWay } from "../types/overpass.js";
import { MergeData, MergeWay, MergeWayTags, MergeWayTagsIn } from "../types/processed.js";
import { toBoolean, toDoubleArray, toNumber } from "./conversions.js";
import {
	inferJunction,
	inferLanes,
	inferLanesBackward,
	inferLanesForward,
	inferOneway,
	inferSurface,
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
			surface: tagsRaw?.surface,
			lanes: toNumber(tagsRaw?.lanes),
			lanesForward: toNumber(tagsRaw?.["lanes:forward"]),
			lanesBackward: toNumber(tagsRaw?.["lanes:backward"]),
			turnLanes: toDoubleArray(tagsRaw?.["turn:lanes"]),
			turnLanesForward: toDoubleArray(tagsRaw?.["turn:lanes:forward"]),
			turnLanesBackward: toDoubleArray(tagsRaw?.["turn:lanes:backward"])
		};

		// infer data
		const changed = new Atomic(true);
		while (changed.get() === true) {
			changed.set(false);

			inferOneway(tags, changed);
			inferJunction(tags, changed);
			inferSurface(tags, changed);

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

		data.set(id, wayData);
	}

	return data;
}

/**
 * Attempt to compile a key to a {@link MergeWayTags} from a {@link Partial} representation.
 *
 * @param tags The object containing the {@link Partial} tags.
 * @param tag The specific tag to compile.
 * @throws {TagError} If the tag could not be compiled.
 * @returns The compiled tag.
 */
function compile<Tag extends keyof MergeWayTags, Value extends MergeWayTags[Tag]>(
	tags: Partial<MergeWayTags>,
	tag: Tag
): Value {
	const value = tags[tag];
	if (isNullish(value)) throw TagError.missingTag(tag);
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

export class TagError extends MessageBoxError {
	static missingTag(tag: string) {
		return new TagError(`Tag '${tag}' is missing and could not be inferred`);
	}

	static invalidTagValue(type: string, value: string) {
		return new TagError(`Value '${value}' is not valid for type '${type}'`);
	}
}
