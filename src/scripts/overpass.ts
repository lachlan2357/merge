import { Database } from "./database.js";
import { CANVAS } from "./map/canvas.js";
import { MESSAGE_BOX, MessageBoxError } from "./messages.js";
import { Settings } from "./settings.js";
import { State } from "./state.js";
import { nullish } from "./supplement/index.js";
import {
	ImportedData,
	OverpassNode,
	OverpassRelation,
	OverpassResponse,
	OverpassWay,
	WayData
} from "./types/overpass.js";

export class Overpass {
	/**
	 * Request the Overpass API for the required search.
	 *
	 * @param searchTerm The user's search term.
	 * @throws {OverpassError} If the search was unsuccessful.
	 */
	static async search(searchTerm: string) {
		// transform search term into query mode
		const roadName = searchTerm;
		const roadNumber = Number(searchTerm);

		if (roadName.length === 0) throw OverpassError.MALFORMED_SEARCH;
		if (roadName.includes('"')) throw OverpassError.ILLEGAL_CHARACTER;

		const searchMode = isNaN(roadNumber)
			? `<has-kv k="name" v="${roadName}"/>`
			: `<id-query type="relation" ref="${roadName}"/>`;

		// query the Overpass API
		const query = await this.query(searchMode);

		// sort response into nodes, ways and relations
		const nodes = new Map<number, OverpassNode>();
		const ways = new Map<number, OverpassWay>();
		const relations = new Array<OverpassRelation>();

		for (let i = 0, n = query.elements.length; i < n; i++) {
			const element = query.elements[i];

			switch (element.type) {
				case "relation":
					relations.push(element);
					break;
				case "way":
					if (element.tags?.highway) ways.set(element.id, element);
					break;
				case "node":
					nodes.set(element.id, element);
					break;
			}
		}

		if (relations.length > 1) throw OverpassError.MULTIPLE_RELATIONS;
		const relation = relations[0];

		if (!relation) throw OverpassError.NO_RESULT;
		State.currentRelationId.set(relation.id);

		const wayIdsInRelation = new Array<number>();

		for (let i = 0, n = relation.members.length; i < n; i++) {
			wayIdsInRelation.push(relation.members[i].ref);
		}

		const externalWays = new Array<OverpassWay>();
		ways.forEach((way, id) => {
			if (!wayIdsInRelation.includes(id)) {
				externalWays.push(way);
				ways.delete(id);
			}
		});

		// set map data
		this.process(ways, nodes);
		CANVAS.centre();
		State.allWays.set(ways);
	}

	/**
	 * Request a query from the Overpass API.
	 *
	 * This method will first check whether a previous identical request has been cached before
	 * performing an API request, returning the cached data if it is available and hasn't been
	 * set to be ignored for this request.
	 *
	 * @param mode The Overpass search mode.
	 * @throws {Database}
	 * @returns
	 */
	static async query(mode: string) {
		const query = `<osm-script output="json"><union><query type="relation">${mode}</query><recurse type="relation-way"/><recurse type="way-node"/><recurse type="node-way"/></union><print/></osm-script>`;
		const ignoreCache = Settings.get("ignoreCache");

		let database_result: OverpassResponse | null = null;

		try {
			if (!ignoreCache) {
				const database = await Database.connect();
				database_result = await database.get(query);
			}
		} catch (error) {
			if (error instanceof MessageBoxError) error.display();
			else console.error(error);
		} finally {
			if (database_result !== null) return database_result;
			else return await this.fetch(query);
		}
	}

	/**
	 * Perform a fetch request to the Overpass API.
	 *
	 * @param query The query to request from the API.
	 * @throws {OverpassError} If the request was unsuccessful.
	 * @returns The response from this query.
	 */
	static async fetch(query: string) {
		MESSAGE_BOX.display("overpassDownload");

		const req = await fetch(Settings.get("endpoint"), {
			method: "POST",
			body: query
		});

		const json: OverpassResponse | undefined = await req.json();
		if (json === undefined) throw OverpassError.REQUEST_ERROR;

		const database = await Database.connect();
		if (json.elements.length > 0)
			await database.set({ request: query, value: JSON.stringify(json) });

		Settings.set("ignoreCache", false);
		return json;
	}

	static process(allWays: Map<number, OverpassWay>, allNodes: Map<number, OverpassNode>) {
		const waysInfo: ImportedData = new Map();
		allWays.forEach((way, id) => {
			const tags = way.tags;
			const wayData: WayData = {
				nodes: new Map(),
				originalWay: way,
				orderedNodes: way.nodes,
				tags: {
					oneway: this.bool(tags?.oneway),
					junction: tags?.junction,
					lanes: this.number(tags?.lanes),
					lanesForward: this.number(tags?.["lanes:forward"]),
					lanesBackward: this.number(tags?.["lanes:backward"]),
					turnLanes: this.dArray(this.array(tags?.["turn:lanes"])),
					turnLanesForward: this.dArray(this.array(tags?.["turn:lanes:forward"])),
					turnLanesBackward: this.dArray(this.array(tags?.["turn:lanes:backward"])),
					surface: tags?.surface
				},
				warnings: new Array(),
				inferences: new Set()
			};

			for (let i = 0, n = way.nodes.length; i < n; i++) {
				const id = way.nodes[i];
				const node = allNodes.get(id);

				if (!node) continue;
				wayData.nodes.set(id, node);
			}

			// infer data
			let noChanges = false;
			while (!noChanges) {
				noChanges = true;
				const tags = wayData.tags;

				// lanes
				if (nullish(tags.lanes) && !nullish(tags.lanesForward)) {
					if (tags.oneway) {
						tags.lanes = tags.lanesForward;
						noChanges = false;
					} else if (!nullish(tags.lanesBackward)) {
						tags.lanes = tags.lanesForward + tags.lanesBackward;
						noChanges = false;
					}
				}

				// lanes:forward
				if (nullish(tags.lanesForward) && !nullish(tags.lanes)) {
					if (tags.oneway) {
						tags.lanesForward = tags.lanes;
						noChanges = false;
					} else if (!nullish(tags.lanesBackward)) {
						tags.lanesForward = tags.lanes - tags.lanesBackward;
						noChanges = false;
					} else if (!tags.oneway && tags.lanes % 2 === 0) {
						tags.lanesForward = tags.lanes / 2;
						noChanges = false;
					}
				}

				// lanes:backward
				if (nullish(tags.lanesBackward)) {
					if (tags.oneway) {
						tags.lanesBackward = 0;
						noChanges = false;
					} else if (!nullish(tags.lanes) && !nullish(tags.lanesForward)) {
						tags.lanesBackward = tags.lanes - tags.lanesForward;
						noChanges = false;
					} else if (!nullish(tags.lanes) && !(tags.lanes % 2)) {
						tags.lanesBackward = tags.lanes / 2;
						noChanges = false;
					}
				}

				// turn:lanes:forward
				if (nullish(tags.turnLanesForward)) {
					if (tags.oneway && !nullish(tags.turnLanes)) {
						tags.turnLanesForward = tags.turnLanes;
						noChanges = false;
					} else if (!nullish(tags.lanesForward)) {
						tags.turnLanesForward = this.dArray(
							this.array("|".repeat(tags.lanesForward))
						);
						noChanges = false;
					}
				}

				// turn:lanes:backward
				if (nullish(tags.turnLanesBackward) && !nullish(tags.lanesBackward)) {
					tags.turnLanesBackward = this.dArray(
						this.array("|".repeat(tags.lanesBackward))
					);
					noChanges = false;
				}
			}

			waysInfo.set(id, wayData);
		});

		State.data.set(waysInfo);
	}

	private static bool(value?: string) {
		if (value) return value === "yes";
		else return undefined;
	}

	private static number(value?: string) {
		const num = Number(value);
		if (!isNaN(num)) return num;
		else return undefined;
	}

	private static array(value?: string, delimiter = "|") {
		return value?.split(delimiter).map(value => value || "none") ?? new Array<string>();
	}

	private static dArray(array?: Array<string>, delimiter = ";") {
		return (
			array?.map(value => value.split(delimiter).map(value => value || "none")) ??
			new Array<Array<string>>()
		);
	}
}

export class OverpassError extends MessageBoxError {
	static readonly MALFORMED_SEARCH = new OverpassError("Invalid search term.");
	static readonly ILLEGAL_CHARACTER = new OverpassError(
		"Currently, double quotes in search terms are not supported."
	);

	static readonly MULTIPLE_RELATIONS = new OverpassError(
		"Multiple relations share that name. Use relation id."
	);
	static readonly NO_RESULT = new OverpassError("Search returned no results.");

	static readonly REQUEST_ERROR = new OverpassError("Overpass request failed.");
}
