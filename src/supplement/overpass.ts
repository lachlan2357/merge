import {
	OverpassNode,
	OverpassRelation,
	OverpassResponse,
	OverpassWay
} from "../index.js";
import { process, settings } from "../script.js";
import { centre } from "./canvas.js";
import {
	deleteEntry,
	getAllCacheKeys,
	getCachedFor,
	insertInto
} from "./database.js";
import { setSearching } from "./dom.js";
import { AppMsg, displayMessage } from "./messages.js";
import { allWays, currentRelationId } from "./view.js";

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

	const query = await overpassQuery(searchMode);

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

export async function overpassQuery(mode: string): Promise<OverpassResponse> {
	const query = `<osm-script output="json"><union><query type="relation">${mode}</query><recurse type="relation-way"/><recurse type="way-node"/><recurse type="node-way"/></union><print/></osm-script>`;
	const allCacheKeys = await getAllCacheKeys();
	const inCache = allCacheKeys.includes(query);
	const ignoreCache = settings.get("ignoreCache");

	if (inCache && !ignoreCache) return await getCachedFor(query);
	else return overpassGetData(query);
}

export async function overpassGetData(query: string) {
	displayMessage("overpassDownload");

	const req = await fetch(settings.get("endpoint"), {
		method: "POST",
		body: query
	});
	const json: OverpassResponse = await req.json();

	const allKeys = await getAllCacheKeys();
	if (allKeys.includes(query)) await deleteEntry(query);
	if (json.elements.length > 0) await insertInto(query, JSON.stringify(json));
	return json;
}

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
