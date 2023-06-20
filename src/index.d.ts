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
		"highway": string;
		"lanes": number;
		"maxspeed": number;
		"oneway": string;
		"junction": string;
		"lanes:forward": number;
		"lanes:backward": number;
		"turn:lanes": string;
		"turn:lanes:forward": string;
		"turn:lanes:backward": string;
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

export interface ImportedData {
	[key: string]: {
		"nodes": {
			[key: string]: {
				id: number;
				lat: number;
				lon: number;
			};
		};
		"orderedNodes": number[];
		"oneway": boolean;
		"lanes": number | null;
		"lanes:forward": number | null;
		"lanes:backward": number | null;
		"turn:lanes:forward": string;
		"turn:lanes:backward": string;
		"surface": string | null;
		"warnings": number[];
	};
}

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
