import { TagWarning } from "../overpass/warnings.js";
import {
	OsmBoolean,
	OsmDoubleArray,
	OsmMaybe,
	OsmString,
	OsmUnsignedInteger,
	OsmValue,
	OsmInnerValue
} from "./osm.js";
import { OverpassNode, OverpassWay } from "./overpass.js";

/**
 * Representing a record of tag-values where each tag may be unset.
 *
 * @template T The tag-value object.
 */
export type MergePartial<T> = { [Key in keyof T]: Maybe<T[Key]> };

/**
 * Representing a record of tag-values where each tag must be set.
 *
 * @template T The tag-value object.
 */
export type MergeCertain<T> = { [Key in keyof T]: Certain<T[Key]> };

/** Format for processed way data. */
export interface MergeWay {
	/** All nodes in this way. */
	nodes: Map<number, OverpassNode>;
	/** The original way data. */
	originalWay: OverpassWay;
	/** All nodes ordered from one end of the way to the other. */
	orderedNodes: Array<number>;
	/** All tags set on this node. */
	tags: MergeWayTags;
	/** All tags that have been inferred for this node. */
	inferences: InferencesMade;
	/** All warnings generated from potentially problematic tags. */
	warnings: Map<MergeWayTag, Set<TagWarning>>;
}

/** Collection of {@link MergeWayTags} which have had their value inferred rather than specified. */
export type InferencesMade = Set<MergeWayTag>;

/** Required tags for each {@link MergeWay}. */
export interface MergeWayTags {
	/** OpenStreetMap `junction` tag. */
	junction: OsmString;
	/** OpenStreetMap `oneway` tag. */
	oneway: OsmBoolean;
	/** OpenStreetMap `surface` tag. */
	surface: OsmString;
	/** OpenStreetMap `lanes` tag. */
	lanes: OsmUnsignedInteger;
	/** OpenStreetMap `lanes:forward` tag. */
	lanesForward: OsmUnsignedInteger;
	/** OpenStreetMap `lanes:backward` tag. */
	lanesBackward: OsmUnsignedInteger;
	/** OpenStreetMap `turn:lanes:forward` tag. */
	turnLanesForward: OsmDoubleArray<OsmString>;
	/** OpenStreetMap `turn:lanes:backward` tag. */
	turnLanesBackward: OsmDoubleArray<OsmString>;
}

/** All currently recognised tags for a {@link OverpassWay}. */
export type MergeWayTag = Pretty<keyof MergeWayTags>;

/**
 * Representing that an {@link OsmType} may not exist.
 *
 * @template OsmType The underlying type.
 */
export type Maybe<OsmType> = OsmType extends OsmValue<OsmInnerValue> ? OsmMaybe<OsmType> : never;

/**
 * Representing that a {@link OsmType} certainly exists.
 *
 * @template OsmMaybeType The underlying maybe type.
 */
export type Certain<OsmMaybeType> = OsmMaybeType extends OsmMaybe<infer T> ? T : never;

/** Tags not required for each {@link MergeWay}, but are required for inferring other tags. */
interface MergeWayTagsHelper {
	/** OpenStreetMap `turn:lanes` tag. */
	turnLanes: OsmDoubleArray<OsmString>;
}

/**
 * Union of {@link MergeWayTags} and {@link MergeWayTagsHelper} to represent the in-tags for
 * processing.
 */
export type MergeWayTagsIn = Pretty<MergePartial<MergeWayTags & MergeWayTagsHelper>>;

/** Each tag available under {@link MergeWayTags}. */
export type MergeWayTagIn = Pretty<keyof MergeWayTagsIn>;

/** All imported data represented as a map between the Way ID and its {@link MergeWay}. */
export type MergeData = Map<number, MergeWay>;

/** Representation of an object in it's simplest key-value form. */
export type Pretty<Obj> = { [Key in keyof Obj]: Obj[Key] } & {};
