import {
	getAllCacheKeys,
	getCachedFor,
	deleteEntry,
	insertInto,
} from "./database.js";
import { settings } from "../script.js";
import { OverpassResponse } from "../index.js";
import { displayMessage } from "./messages.js";

export async function overpassQuery(query: string): Promise<OverpassResponse> {
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
