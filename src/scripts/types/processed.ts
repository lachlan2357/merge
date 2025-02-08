import { TagWarning } from "../overpass/warnings.js";
import {
	OsmBoolean,
	OsmDoubleArray,
	OsmMaybe,
	OsmString,
	OsmUnsignedInteger,
	OsmValue,
	ToString
} from "./osm.js";
import { OverpassNode, OverpassWay } from "./overpass.js";

export type MergePartial<T> = { [Key in keyof T]: Maybe<T[Key]> };

/**
 * Format for processed way data.
 */
export interface MergeWay {
	nodes: Map<number, OverpassNode>;
	originalWay: OverpassWay;
	orderedNodes: Array<number>;
	tags: MergeWayTags;
	inferences: InferencesMade;
	warnings: Map<MergeWayTag, Set<TagWarning>>;
}

/**
 * Collection of {@link MergeWayTags} which have had their value inferred rather than specified.
 */
export type InferencesMade = Set<MergeWayTag>;

/**
 * Required tags for each {@link MergeWay}.
 */
export interface MergeWayTags {
	junction: OsmString;
	oneway: OsmBoolean;
	surface: OsmString;
	lanes: OsmUnsignedInteger;
	lanesForward: OsmUnsignedInteger;
	lanesBackward: OsmUnsignedInteger;
	turnLanesForward: OsmDoubleArray<OsmString>;
	turnLanesBackward: OsmDoubleArray<OsmString>;
}

/**
 * All currently recognised tags for a {@link OverpassWay}.
 */
export type MergeWayTag = keyof MergeWayTags;

export type Maybe<OsmType> = OsmType extends OsmValue<ToString> ? OsmMaybe<OsmType> : never;

/**
 * Tags not required for each {@link MergeWay}, but are required for inferring other tags.
 */
export interface MergeWayTagsHelper {
	turnLanes: OsmDoubleArray<OsmString>;
}

/**
 * Union of {@link MergeWayTags} and {@link WayDataTAgsHelper} to represent the in-tags for
 * processing.
 */
export type MergeWayTagsIn = MergePartial<MergeWayTags & MergeWayTagsHelper>;

/**
 * All imported data represented as a map between the Way ID and its {@link MergeWay}.
 */
export type MergeData = Map<number, MergeWay>;
