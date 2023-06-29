import { Result } from "./index.js";
import { setAndSearch, togglePopup } from "./supplement/dom.js";
import { ElementBuilder } from "./supplement/elements.js";
import { Err, isErr, resultConstructor } from "./supplement/errors.js";
import { Settings } from "./supplement/settings.js";

const stage = <T>(
	description: string,
	setupFn: () => Promise<Result<T, undefined>>
) => ({
	description,
	check: async () => {
		try {
			return await setupFn();
		} catch {
			return new Err(undefined);
		}
	}
});

async function setup() {
	const settings = await stage("local storage compatibility", async () => {
		return resultConstructor(new Settings());
	}).check();
	if (!settings.ok) return settings;

	const database = await stage("database", () => {
		return new Promise<Result<IDBDatabase, undefined>>(resolve => {
			const timeout = setTimeout(() => resolve(new Err(undefined)), 5000);
			const openRequest = window.indexedDB.open("Overpass Data");

			openRequest.onerror = () => {
				window.clearTimeout(timeout);
				resolve(new Err(undefined));
			};
			openRequest.onupgradeneeded = function (e) {
				const tempDB = (e.target as IDBOpenDBRequest).result;
				tempDB.createObjectStore("overpass-cache", {
					keyPath: "request"
				});
			};

			openRequest.onsuccess = function () {
				window.clearTimeout(timeout);
				resolve(resultConstructor(this.result));
			};
		});
	}).check();
	if (!database.ok) return database;

	const context = await stage("dom + canvas", async () => {
		const canvas = document.getElementsByTagName("canvas").item(0);
		const context = canvas?.getContext("2d") ?? undefined;
		return resultConstructor(context);
	}).check();
	if (!context.ok) return context;

	return { settings, database, context };
}

const result = await setup();

if (isErr(result)) {
	const main = document.querySelector("main");
	if (!main) throw "DOM cannot be located";

	while (main.lastChild) main.removeChild(main.lastChild);

	const title = new ElementBuilder("h2").text("Incompatible Device").build();
	const message = new ElementBuilder("p")
		.text("Your device is incompatible with this Application.")
		.build();

	main.append(title, message);
	main.setAttribute("error", "");

	throw "Your device cannot run this application.";
}

export const settings = result.settings.unwrap();
export const database = result.database.unwrap();
export const context = result.context.unwrap();

// permalinks
const hash = window.location.hash;
if (hash.length > 0) {
	const id = Number(hash.substring(1));
	if (!isNaN(id)) setAndSearch(id.toString());
	else setAndSearch();
} else setAndSearch();

// first time popup
if (settings.get("firstLaunch")) {
	settings.set("firstLaunch", false);
	togglePopup("welcome");
}
