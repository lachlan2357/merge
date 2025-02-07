import { MessageBoxError } from "../messages.js";
import { OsmBoolean, OsmString, OsmUnsignedInteger, OsmValue, ToString } from "../types/osm.js";
import { OverpassNode, OverpassWay } from "../types/overpass.js";
import {
	MergeData,
	MergeWay,
	MergeWayTag,
	MergeWayTags,
	MergeWayTagsIn
} from "../types/processed.js";
import { performInferences, performTransforms } from "./inferences/index.js";

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
			oneway: OsmValue.from(tagsRaw?.oneway, OsmBoolean),
			junction: OsmValue.from(tagsRaw?.junction, OsmString),
			surface: OsmValue.from(tagsRaw?.surface, OsmString),
			lanes: OsmValue.from(tagsRaw?.lanes, OsmUnsignedInteger),
			lanesForward: OsmValue.from(tagsRaw?.["lanes:forward"], OsmUnsignedInteger),
			lanesBackward: OsmValue.from(tagsRaw?.["lanes:backward"], OsmUnsignedInteger),
			turnLanes: OsmValue.fromDoubleArray(tagsRaw?.["turn:lanes"], OsmString),
			turnLanesForward: OsmValue.fromDoubleArray(tagsRaw?.["turn:lanes:forward"], OsmString),
			turnLanesBackward: OsmValue.fromDoubleArray(tagsRaw?.["turn:lanes:backward"], OsmString)
		};

		// infer data
		const inferredTags = performInferences(tags);

		// compile tags
		const compiledTags: MergeWayTags = {
			oneway: compile(tags, "oneway"),
			junction: compile(tags, "junction"),
			lanes: compile(tags, "lanes"),
			lanesForward: compile(tags, "lanesForward"),
			lanesBackward: compile(tags, "lanesBackward"),
			turnLanesForward: compile(tags, "turnLanesForward"),
			turnLanesBackward: compile(tags, "turnLanesBackward"),
			surface: compile(tags, "surface")
		} satisfies Record<string, OsmValue<ToString>>;

		// format compiled tags
		const warnings = performTransforms(compiledTags);

		// compile tags into way data
		const wayData: MergeWay = {
			nodes: allNodes,
			originalWay: way,
			orderedNodes: way.nodes,
			tags: compiledTags,
			warnings: warnings,
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
	if (!isSet(value)) throw new MissingTagError(tag);
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

export function isEq<Value extends OsmValue<T>, T extends ToString>(
	tag: Value | undefined | null,
	cmp: Value | T
): boolean {
	if (!isSet(tag)) return false;
	return tag.eq(cmp);
}

class MissingTagError extends MessageBoxError {
	constructor(tag: string) {
		super(`Tag '${tag}' is missing and could not be inferred.`);
	}
}
