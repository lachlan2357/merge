import {
	getAllCacheKeys,
	getCachedFor,
	deleteEntry,
	insertInto,
} from "./database.js";
import { settings } from "../script.js";
import { OverpassResponse } from "../index.js";
import { displayMessage } from "./messages.js";

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
		body: query,
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
