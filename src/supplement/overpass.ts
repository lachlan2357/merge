import { displayMessage } from "../script.js";
import {
	getAllCacheKeys,
	getCachedFor,
	deleteEntry,
	insertInto,
} from "./database.js";
import { settings } from "../script.js";
import { OverpassResponse } from "../index.js";

export async function overpassQuery(query: string): Promise<OverpassResponse> {
	const allCacheKeys = await getAllCacheKeys();
	const inCache = allCacheKeys.includes(query);
	const ignoreCache = settings.get("ignoreCache");

	if (inCache && !ignoreCache) return await getCachedFor(query);
	else return overpassGetData(query);
}

export async function overpassGetData(query: string) {
	displayMessage("Downloading from Overpass...");

	const req = await fetch(settings.get("endpoint"), {
		method: "POST",
		body: query,
	});
	const json: OverpassResponse = await req.json();

	const allKeys = await getAllCacheKeys();
	if (allKeys.includes(query)) await deleteEntry(query);
	if (json.elements.length > 0) await insertInto(query, JSON.stringify(json));
	return json;

	// return new Promise<string>(resolve => {
	// 	displayMessage("Downloading from Overpass...");

	// 	const request: XMLHttpRequest = new XMLHttpRequest();
	// 	request.open("POST", settings.get("endpoint"));

	// 	request.send(query);

	// 	request.onload = async () => {
	// 		if (request.readyState == 4) {
	// 			if (request.status == 200) {
	// 				const allKeys = await getAllCacheKeys();
	// 				if (allKeys.includes(query)) {
	// 					await deleteEntry(query);
	// 				}

	// 				if (JSON.parse(request.response).elements.length != 0)
	// 					await insertInto(query, request.response);
	// 				resolve(request.response);
	// 			} else {
	// 				console.error(
	// 					`Error ${request.status}: ${request.statusText}`
	// 				);
	// 				displayMessage(
	// 					`Overpass Error ${request.status}: ${request.statusText}`
	// 				);
	// 				resolve(`error`);
	// 			}
	// 		}
	// 	};
	// });
}
