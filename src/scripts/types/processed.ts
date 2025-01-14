import { OverpassNode, OverpassWay } from "./overpass.js";

/**
 * Format for processed way data.
 */
export interface MergeWay {
	nodes: Map<number, OverpassNode>;
	originalWay: OverpassWay;
	orderedNodes: Array<number>;
	tags: MergeWayTags;
	warnings: Array<number>;
	inferences: InferencesMade;
}

/**
 * Collection of {@link MergeWayTags} which have had their value inferred rather than specified.
 */
export type InferencesMade = Set<MergeWayTag>;

/**
 * Required tags for each {@link MergeWay}.
 */
export interface MergeWayTags {
	junction: string;
	oneway: boolean;
	surface: string;
	lanes: number;
	lanesForward: number;
	lanesBackward: number;
	turnLanesForward: Array<Array<string>>;
	turnLanesBackward: Array<Array<string>>;
}

/**
 * All currently recognised tags for a {@link OverpassWay}.
 */
export type MergeWayTag = keyof MergeWayTags;

/**
 * Tags not required for each {@link MergeWay}, but are required for inferring other tags.
 */
export interface MergeWayTagsHelper {
	turnLanes: Array<Array<string>>;
}

/**
 * Union of {@link MergeWayTags} and {@link WayDataTAgsHelper} to represent the in-tags for
 * processing.
 */
export type MergeWayTagsIn = Partial<MergeWayTags> & Partial<MergeWayTagsHelper>;

/**
 * All imported data represented as a map between the Way ID and its {@link MergeWay}.
 */
export type MergeData = Map<number, MergeWay>;
