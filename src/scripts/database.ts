import { AppErr, promiseWrapper } from "./errors.js";
import { sleep } from "./supplement.js";
import { OverpassResponse } from "./types.js";

type CachedQuery = {
	request: string;
	value: string;
};

export class Database {
	private static database: IDBDatabase | null | undefined = Database.connect();

	private static connect() {
		const req = window.indexedDB.open("Overpass Data");

		req.onerror = () => (Database.database = null);

		req.onupgradeneeded = () => {
			const database = req.result;
			database.createObjectStore("overpass-cache", { keyPath: "request" });
		};

		req.onsuccess = () => {
			const database = req.result;
			Database.database = database;
		};

		return undefined;
	}

	private static async store(mode: IDBTransactionMode) {
		let database: IDBDatabase | undefined = undefined;

		// try 5 times to get a database, if not, give up
		for (let i = 0; i < 5; i++) {
			if (Database.database === undefined) {
				await sleep(1000);
				continue;
			}

			if (Database.database === null) return;

			database = Database.database;
			break;
		}

		if (database === undefined) return;

		const transaction = database.transaction("overpass-cache", mode);
		const store = transaction.objectStore("overpass-cache");
		return store;
	}

	static async get(key: string) {
		const store = await Database.store("readonly");

		return promiseWrapper<OverpassResponse, AppErr>(
			"db",
			new Promise((resolve, reject) => {
				if (store === undefined) return reject();
				const req = store.get(key);

				req.onerror = () => reject();

				req.onsuccess = () => {
					const data: CachedQuery | undefined = req.result;
					if (data === undefined) return reject();

					const json: OverpassResponse = JSON.parse(data.value);
					resolve(json);
				};
			})
		);
	}

	static async keys() {
		const store = await Database.store("readonly");

		return promiseWrapper<Array<string>, AppErr>(
			"db",
			new Promise((resolve, reject) => {
				if (store === undefined) return reject();
				const req = store.getAllKeys();

				req.onerror = () => reject();

				req.onsuccess = () => {
					const keys = req.result.map(key => key.toString());
					resolve(keys);
				};
			})
		);
	}

	static async insert(request: string, value: string) {
		const store = await Database.store("readwrite");
		return promiseWrapper<boolean, AppErr>(
			"db",
			new Promise((resolve, reject) => {
				if (store === undefined) return reject();
				const req = store.add({ request, value });

				req.onerror = reject;
				req.onsuccess = () => resolve(req.result !== undefined);
			})
		);
	}

	static async delete(key: string) {
		const store = await Database.store("readwrite");

		return promiseWrapper<boolean, AppErr>(
			"db",
			new Promise((resolve, reject) => {
				if (store === undefined) return reject();
				const req = store.delete(key);

				req.onerror = () => reject();
				req.onsuccess = () => resolve(true);
			})
		);
	}
}
