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
	members: Array<{ ref: number; role: string; type: string }>;
	tags?: Record<string, string>;
	type: "relation";
}

export interface OverpassWay {
	changeset: number;
	id: number;
	nodes: Array<number>;
	tags?: {
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
	orderedNodes: Array<number>;
	tags: WayDataTags;
	warnings: Array<number>;
	inferences: Set<keyof WayData["tags"]>;
}

export interface WayDataTagsHelper {
	turnLanes: Array<Array<string>>;
}

export interface WayDataTags {
	junction: string;
	oneway: boolean;
	lanes: number;
	lanesForward: number;
	lanesBackward: number;
	turnLanesForward: Array<Array<string>>;
	turnLanesBackward: Array<Array<string>>;
	surface: string;
}

export type WayDataTagsIn = Partial<WayDataTags> & Partial<WayDataTagsHelper>;

export type ImportedData = Map<number, WayData>;
