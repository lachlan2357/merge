import { Database } from "../database.js";
import { CANVAS } from "../map/canvas.js";
import * as MessageBox from "../messages.js";
import * as Settings from "../settings/index.js";
import { State } from "../state/index.js";
import {
	OverpassNode,
	OverpassRelation,
	OverpassResponse,
	OverpassWay
} from "../types/overpass.js";
import { process } from "./process.js";
/**
 * Request the Overpass API for the required search.
 *
 * @param searchTerm The user's search term.
 * @throws {OverpassError} If the search was unsuccessful.
 */
export async function overpassSearch(searchTerm: string) {
	// construct query string
	const queryString = buildQuery(searchTerm);
	let response: OverpassResponse | null = null;

	// check database for cached result, if applicable
	const skipDatabase = Settings.get("ignoreCache");
	if (!skipDatabase) {
		const database = await Database.connect();
		response = await database.get(queryString);
	}

	// request from Overpass API if required
	if (response === null) response = await fetchFromApi(queryString);

	// transform data into a useable state
	const transformedData = transform(response);
	const processedData = process(transformedData.nodes, transformedData.ways);

	// set map data
	State.currentRelationId.set(transformedData.relations[0].id);
	State.data.set(processedData);
	State.allWays.set(transformedData.ways);

	CANVAS.centre();
}

/**
 * Build the Overpass Query String for a specific search term.
 *
 * @param searchTerm The search term to build the query for.
 * @returns The query string.
 * @throws {OverpassError} If the query could not be built.
 */
function buildQuery(searchTerm: string) {
	const roadName = searchTerm;
	const roadNumber = Number(searchTerm);

	// validate input
	if (roadName.length === 0) throw OverpassError.MALFORMED_SEARCH;
	if (roadName.includes('"')) throw OverpassError.ILLEGAL_CHARACTER;

	// choose search mode depending if relation name or id is given
	const searchMode = isNaN(roadNumber)
		? `<has-kv k="name" v="${roadName}"/>`
		: `<id-query type="relation" ref="${roadName}"/>`;

	// construct query
	const queryString = `<osm-script output="json"><union><query type="relation">${searchMode}</query><recurse type="relation-way"/><recurse type="way-node"/><recurse type="node-way"/></union><print/></osm-script>`;
	return queryString;
}

/**
 * Transform an {@link OverpassResponse} into sorted sets of {@link OverpassNode Nodes},
 * {@link OverpassWay Ways} and {@link OverpassRelation Relations}.
 *
 * @param response The {@link OverpassResponse} direct from an API or Database call.
 * @returns The sorted {@link OverpassNode Nodes}, {@link OverpassWay Ways} and
 * {@link OverpassRelation Relations}.
 * @throws {OverpassError} If the {@link response} is not valid for this application's purpose.
 */
function transform(response: OverpassResponse) {
	const nodes = new Map<number, OverpassNode>();
	const ways = new Map<number, OverpassWay>();
	const relations = new Array<OverpassRelation>();

	// sort response into nodes, ways and relations
	for (const element of response.elements) {
		switch (element.type) {
			case "node":
				nodes.set(element.id, element);
				break;
			case "way":
				ways.set(element.id, element);
				break;
			case "relation":
				relations.push(element);
				break;
		}
	}

	// ensure only 1 relation was returned
	const relation = relations[0];
	if (relation === undefined) throw OverpassError.NO_RESULT;
	if (relations.length > 1) throw OverpassError.MULTIPLE_RELATIONS;

	// remove all ways that aren't part to the relation
	const keepWayIds = relation.members.map(member => member.ref);
	for (const key of ways.keys()) if (!keepWayIds.includes(key)) ways.delete(key);

	return { nodes, ways, relations };
}

/**
 * Perform a fetch request to the Overpass API.
 *
 * @param queryString The query string to request from the API.
 * @returns The response from this query.
 * @throws {OverpassError} If the request was unsuccessful.
 */
async function fetchFromApi(queryString: string) {
	MessageBox.displayMessage("overpassDownload");

	// perform api request
	const req = await fetch(Settings.get("endpoint"), {
		method: "POST",
		body: queryString
	});

	// retrieve json body
	const json: OverpassResponse | undefined = await req.json();
	if (json === undefined) throw OverpassError.REQUEST_ERROR;

	// cache response data
	const database = await Database.connect();
	if (json.elements.length > 0)
		await database.set({ request: queryString, value: JSON.stringify(json) });

	Settings.set("ignoreCache", false);
	return json;
}

class OverpassError extends MessageBox.MessageBoxError {
	static readonly MALFORMED_SEARCH = new OverpassError("Invalid search term.");
	static readonly ILLEGAL_CHARACTER = new OverpassError(
		"Currently, double quotes in search terms are not supported."
	);

	static readonly NO_RESULT = new OverpassError("Search returned no results.");
	static readonly MULTIPLE_RELATIONS = new OverpassError(
		"Multiple relations share that name. Use relation id."
	);

	static readonly REQUEST_ERROR = new OverpassError("Overpass request failed.");
}
