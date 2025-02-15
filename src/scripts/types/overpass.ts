/**
 * JSON response object from an Overpass API request.
 *
 * A successful request to the Overpass API will always yield a result in this format, however an
 * unsuccessful request will be returned as XML instead of JSON, so if a response cannot be parsed
 * as JSON into this structure, the request has not been successful.
 */
export interface OverpassResponse {
	version: number;
	generator: string;
	osm3s: {
		timestamp_osm_base: string;
		copyright: string;
	};
	elements: Array<OverpassElement>;
}

/**
 * How OSM relations are represented in an Overpass API response.
 */
export interface OverpassRelation {
	id: number;
	members: Array<{ ref: number; role: string; type: string }>;
	tags?: Record<string, string>;
	type: "relation";
}

/**
 * How OSM ways are represented in an Overpass API response.
 */
export interface OverpassWay {
	changeset: number;
	id: number;
	nodes: Array<number>;
	tags?: Partial<{
		"highway": string;
		"lanes": string;
		"maxspeed": string;
		"oneway": string;
		"junction": string;
		"lanes:forward": string;
		"lanes:backward": string;
		"turn:lanes": string;
		"turn:lanes:forward": string;
		"turn:lanes:backward": string;
		"surface": string;
	}>;
	timestamp: string;
	type: "way";
	uid: number;
	user: string;
	version: number;
}

/**
 * How OSM nodes are represented in an Overpass API response.
 */
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

/**
 * All possible elements as represented in an Overpass API response.
 */
type OverpassElement = OverpassRelation | OverpassWay | OverpassNode;
