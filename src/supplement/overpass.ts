import { displayMessage } from "../script.js";
import {
	getAllCacheKeys,
	getCachedFor,
	deleteEntry,
	insertInto,
} from "./database.js";
import { settings, getSetting } from "./settings.js";

export async function overpassQuery(query: string): Promise<string> {
	let data: string;
	const allCacheKeys: string[] = await getAllCacheKeys();

	if (allCacheKeys.includes(query) && !settings["Ignore Cache"].value) {
		const request = await getCachedFor(query);
		data = request["value"];
	} else {
		const request = await overpassGetData(query);
		data = request;
	}

	return new Promise<string>(resolve => {
		resolve(data as string);
	});
}

export async function overpassGetData(query: string): Promise<string> {
	return new Promise<string>(resolve => {
		displayMessage("Downloading from Overpass...");

		const request: XMLHttpRequest = new XMLHttpRequest();
		request.open("POST", getSetting("Endpoint"));

		request.send(query);

		request.onload = async () => {
			if (request.readyState == 4) {
				if (request.status == 200) {
					const allKeys = await getAllCacheKeys();
					if (allKeys.includes(query)) {
						await deleteEntry(query);
					}

					if (JSON.parse(request.response).elements.length != 0)
						await insertInto(query, request.response);
					resolve(request.response);
				} else {
					console.error(
						`Error ${request.status}: ${request.statusText}`
					);
					displayMessage(
						`Overpass Error ${request.status}: ${request.statusText}`
					);
					resolve(`error`);
				}
			}
		};
	});
}
