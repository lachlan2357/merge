import { MessageBoxError } from "../messages.js";
import { OverpassNode, OverpassWay } from "../types/overpass.js";
import {
	MergeData,
	MergeWay,
	MergeWayTag,
	MergeWayTags,
	MergeWayTagsIn
} from "../types/processed.js";
import { toBoolean, toDoubleArray, toNumber } from "./conversions.js";
import { performInferences } from "./inferences.js";

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
		const inferredTags = performInferences(tags);

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
			inferences: inferredTags
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
function compile<Tag extends MergeWayTag, Value extends MergeWayTags[Tag]>(
	tags: Partial<MergeWayTags>,
	tag: Tag
): Value {
	const value = tags[tag];
	if (!isSet(value)) throw TagError.missingTag(tag);
	return value as Value;
}

/**
 * Determine whether the value of a tag has been set.
 *
 * A tag is deemed to be set if its value is neither `null` or `undefined`.
 *
 * @param tag The tag to check if set.
 * @returns Whether the tag has its value set.
 */
export function isSet<T>(tag: T | undefined | null): tag is T {
	return !(tag === null || tag === undefined);
}

export class TagError extends MessageBoxError {
	static missingTag(tag: string) {
		return new TagError(`Tag '${tag}' is missing and could not be inferred`);
	}

	static invalidTagValue(type: string, value: string) {
		return new TagError(`Value '${value}' is not valid for type '${type}'`);
	}
}
