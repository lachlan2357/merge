import { Err, Ok } from "./supplement/errors.ts";

export interface OverpassResponse {
	version: number;
	generator: string;
	osm3s: {
		timestamp_osm_base: string;
		copyright: string;
	};
	elements: Array<OverpassElement>;
}

export interface OverpassRelation {
	id: number;
	members: { ref: number; role: string; type: string }[];
	tags: Record<string, string>;
	type: "relation";
}

export interface OverpassWay {
	changeset: number;
	id: number;
	nodes: number[];
	tags: {
		"highway"?: string;
		"lanes"?: string;
		"maxspeed"?: string;
		"oneway"?: string;
		"junction"?: string;
		"lanes:forward"?: string;
		"lanes:backward"?: string;
		"turn:lanes"?: string;
		"turn:lanes:forward"?: string;
		"turn:lanes:backward"?: string;
		"surface"?: string;
	};
	timestamp: string;
	type: "way";
	uid: number;
	user: string;
	version: number;
}

export interface OverpassNode {
	changeset: number;
	id: number;
	lat: number;
	lon: number;
	timestamp: string;
	type: "node";
	uid: number;
	user: string;
	version: number;
}

export type OverpassElement = OverpassRelation | OverpassWay | OverpassNode;

export interface WayData {
	nodes: Map<number, OverpassNode>;
	originalWay: OverpassWay;
	orderedNodes: number[];
	tags: {
		junction?: string;
		oneway?: boolean;
		lanes?: number;
		lanesForward?: number;
		lanesBackward?: number;
		turnLanes?: Array<Array<string>>;
		turnLanesForward?: Array<Array<string>>;
		turnLanesBackward?: Array<Array<string>>;
		surface?: string;
	};
	warnings: number[];
	inferences: Set<keyof WayData["tags"]>;
}

export type ImportedData = Map<number, WayData>;

export interface Setting<T> {
	name: string;
	description: string;
	inputType: "string" | "boolean";
	value: T;
	setLocalStorage: boolean;
	inSettings: boolean;
}

export type SettingType = string | boolean;

export interface CachedQuery {
	request: string;
	value: string;
}

export type Result<T, E> = Ok<T> | Err<E>;
