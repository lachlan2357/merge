import {
	ImportedData,
	OverpassNode,
	OverpassRelation,
	OverpassResponse,
	OverpassWay,
	WayData
} from "../index.js";
import { settings } from "../script.js";
import { centre } from "./canvas.js";
import {
	deleteEntry,
	getAllCacheKeys,
	getCachedFor,
	insertInto
} from "./database.js";
import { setSearching } from "./dom.js";
import { AppErr, asyncWrapper } from "./errors.js";
import { nullish } from "./index.js";
import { AppMsg, displayMessage } from "./messages.js";
import { allWays, currentRelationId, data } from "./view.js";

export function bool(value?: string) {
	if (value) return value === "yes";
	else return undefined;
}

export function number(value?: string) {
	const num = Number(value);
	if (!isNaN(num)) return num;
	else return undefined;
}

export function array(value?: string, fallback = "none", delimiter = "|") {
	let split = value?.split(delimiter);
	if (fallback) split = split?.map(value => value ?? fallback);
	return split;
}

export function dArray(
	array?: Array<string>,
	fallback = "none",
	delimiter = ";"
) {
	return array?.map(value => {
		let _split = value.split(delimiter);
		if (fallback) _split = _split.map(value => value ?? fallback);
		return _split;
	});
}

export async function search(name: string) {
	const propagateError = (e: AppMsg) => {
		displayMessage(e);
		setSearching(false);
	};

	setSearching();
	const roadName = name;
	const roadNumber = Number(name);

	if (roadName.length === 0) return propagateError("noSearchTerm");

	if (roadName.includes('"')) return propagateError("malformedSearchTerm");

	const searchMode = isNaN(roadNumber)
		? `<has-kv k="name" v="${roadName}"/>`
		: `<id-query type="relation" ref="${roadName}"/>`;

	const queryResult = await overpassQuery(searchMode);
	if (!queryResult.ok) return propagateError("overpassError");
	const query = queryResult.unwrap();

	const relations = new Array<OverpassRelation>();
	const ways = new Map<number, OverpassWay>();
	const nodes = new Map<number, OverpassNode>();

	query.elements.forEach(element => {
		switch (element.type) {
			case "relation":
				relations.push(element);
				break;
			case "way":
				if (element.tags.highway) ways.set(element.id, element);
				break;
			case "node":
				nodes.set(element.id, element);
				break;
		}
	});

	if (relations.length > 1) return propagateError("multipleRelations");
	const relation = relations[0];

	if (!relation) return propagateError("noResult");
	currentRelationId.set(relation.id);

	const wayIdsInRelation = new Array<number>();
	relation.members.forEach(member => wayIdsInRelation.push(member.ref));

	const externalWays = new Array<OverpassWay>();
	ways.forEach((way, id) => {
		if (!wayIdsInRelation.includes(id)) {
			externalWays.push(way);
			ways.delete(id);
		}
	});

	process(ways, nodes);
	centre();
	allWays.set(ways);
	setSearching(false);
}

export async function overpassQuery(mode: string) {
	const query = `<osm-script output="json"><union><query type="relation">${mode}</query><recurse type="relation-way"/><recurse type="way-node"/><recurse type="node-way"/></union><print/></osm-script>`;
	const ignoreCache = settings.get("ignoreCache");

	const result = await getCachedFor(query);
	if (!result.ok || ignoreCache) return await overpassGetData(query);
	else return result;
}

export async function overpassGetData(query: string) {
	return asyncWrapper<OverpassResponse, AppErr>("overpass", async () => {
		displayMessage("overpassDownload");
		const req = await fetch(settings.get("endpoint"), {
			method: "POST",
			body: query
		});
		const json: OverpassResponse | undefined = await req.json();
		if (!json) throw new Error();

		const allKeys = await getAllCacheKeys();
		if (allKeys.ok)
			if (allKeys.unwrap().includes(query)) await deleteEntry(query);
		if (json.elements.length > 0)
			await insertInto(query, JSON.stringify(json));
		return json;
	});
}

export function process(
	allWays: Map<number, OverpassWay>,
	allNodes: Map<number, OverpassNode>
) {
	const waysInfo: ImportedData = new Map();
	allWays.forEach((way, id) => {
		const tags = way.tags;
		const wayData: WayData = {
			nodes: new Map(),
			originalWay: way,
			orderedNodes: way.nodes,
			tags: {
				oneway: bool(tags.oneway),
				junction: tags.junction,
				lanes: number(tags.lanes),
				lanesForward: number(tags["lanes:forward"]),
				lanesBackward: number(tags["lanes:backward"]),
				turnLanes: dArray(array(tags["turn:lanes"], "none"), "none"),
				turnLanesForward: dArray(array(tags["turn:lanes:forward"])),
				turnLanesBackward: dArray(array(tags["turn:lanes:backward"])),
				surface: tags.surface
			},
			warnings: new Array(),
			inferences: new Set()
		};

		way.nodes.forEach(id => {
			const node = allNodes.get(id);
			if (!node) return;
			wayData.nodes.set(id, node);
		});

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
				} else if (
					!nullish(tags.lanes) &&
					!nullish(tags.lanesForward)
				) {
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
					tags.turnLanesForward = dArray(
						array("|".repeat(tags.lanesForward))
					);
					noChanges = false;
				}
			}

			// turn:lanes:backward
			if (
				nullish(tags.turnLanesBackward) &&
				!nullish(tags.lanesBackward)
			) {
				tags.turnLanesBackward = dArray(
					array("|".repeat(tags.lanesBackward))
				);
				noChanges = false;
			}
		}

		waysInfo.set(id, wayData);
	});

	data.set(waysInfo);
}
