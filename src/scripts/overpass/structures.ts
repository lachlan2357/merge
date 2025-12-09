/**
 * JSON response object from an Overpass API request.
 *
 * A successful request to the Overpass API will always yield a result in this format, however an
 * unsuccessful request will be returned as XML instead of JSON, so if a response cannot be parsed
 * as JSON into this structure, the request has not been successful.
 */
export interface OverpassResponse {
	/** The version os Overpass used to generate the response. */
	version: number;
	/** The generator used to generate the response. */
	generator: string;
	/** The OpenStreetMap metadata for the data that was retrieved. */
	osm3s: {
		/** Timestamp when the data from OpenStreetMap was retrieved. */
		timestamp_osm_base: string;
		/** OpenStreetMap copyright notice. */
		copyright: string;
	};
	/** All elements retrieved. */
	elements: Array<OverpassElement>;
}

/** How OSM relations are represented in an Overpass API response. */
export interface OverpassRelation {
	/** The type of this element. */
	type: "relation";
	/** The OpenStreetMap ID of this element. */
	id: number;
	/** All members that form part of this relation. */
	members: Array<{
		/** The ID of the member. */
		ref: number;
		/** The role of the member in the relation. */
		role: string;
		/** The type of the element. */
		type: string;
	}>;
}

/** How OSM ways are represented in an Overpass API response. */
export interface OverpassWay {
	/** The type of this element. */
	type: "way";
	/** The OpenStreetMap ID of this element. */
	id: number;
	/** All nodes that are part of this way. */
	nodes: Array<number>;
	/** All tags set on this way. */
	tags?: Partial<{
		/** The type of highway this way is. */
		"highway": string;
		/** The number of lanes this highway has. */
		"lanes": string;
		/** The speed limit of this highway. */
		"maxspeed": string;
		/** Whether this highway only has lanes in one (forward) direction. */
		"oneway": string;
		/** What type of junction this highway is. */
		"junction": string;
		/** The number of lanes this highway has in the forward direction. */
		"lanes:forward": string;
		/** The number of lanes this highway has in the backward direction. */
		"lanes:backward": string;
		/** The turn markings on each lane of an unspecified direction. */
		"turn:lanes": string;
		/** The turn markings on each lane in the forward direction. */
		"turn:lanes:forward": string;
		/** The turn markings on each lane in the backward direction. */
		"turn:lanes:backward": string;
		/** The surface this way has. */
		"surface": string;
	}>;
}

/** How OSM nodes are represented in an Overpass API response. */
export interface OverpassNode {
	/** The type of this element. */
	type: "node";
	/** The OpenStreetMap ID of this element. */
	id: number;
	/** The latitude of this node. */
	lat: number;
	/** The longitude of this node. */
	lon: number;
}

/** All possible elements as represented in an Overpass API response. */
type OverpassElement = OverpassRelation | OverpassWay | OverpassNode;
