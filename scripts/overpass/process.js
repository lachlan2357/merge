import { MessageBoxError } from "../messages.js";
import { OsmBoolean, OsmMaybe, OsmString, OsmUnsignedInteger, OsmValue } from "../types/osm.js";
import { performInferences, performTransforms } from "./inferences/index.js";
/**
 * Process {@link OverpassNode Nodes}, {@link OverpassWay Ways} and
 * {@link OverpassRelation Relations} into data the map can use to display.
 *
 * @param allNodes All {@link OverpassNode OverpassNodes} to process.
 * @param allWays All {@link OverpassWay OverpassWays} to process.
 * @returns The processed {@link MergeData}.
 */
export function process(allNodes, allWays) {
    const data = new Map();
    for (const [id, way] of allWays) {
        // initial compilation of tag data, to be inferred
        const tagsRaw = way.tags;
        const tags = {
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
        const compiledTags = {
            oneway: compile(tags, "oneway"),
            junction: compile(tags, "junction"),
            lanes: compile(tags, "lanes"),
            lanesForward: compile(tags, "lanesForward"),
            lanesBackward: compile(tags, "lanesBackward"),
            turnLanesForward: compile(tags, "turnLanesForward"),
            turnLanesBackward: compile(tags, "turnLanesBackward"),
            surface: compile(tags, "surface")
        };
        // format compiled tags
        const warnings = performTransforms(compiledTags);
        // compile tags into way data
        const wayData = {
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
function compile(tags, tag) {
    const value = tags[tag];
    if (!value.isSet())
        throw new MissingTagError(tag);
    return value.get();
}
/**
 * Determine whether the value of a tag has been set.
 *
 * A tag is deemed to be set if its value is neither `null` or `undefined`.
 *
 * @param tag The tag to check if set.
 * @returns Whether the tag has its value set.
 */
export function isEq(tag, cmp) {
    if (tag === undefined)
        return false;
    if (tag instanceof OsmMaybe) {
        if (!tag.isSet())
            return false;
        else
            return tag.get().eq(cmp);
    }
    else {
        return tag.eq(cmp);
    }
}
class MissingTagError extends MessageBoxError {
    constructor(tag) {
        super(`Tag '${tag}' is missing and could not be inferred.`);
    }
}
