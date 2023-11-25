import { AppErr, promiseWrapper } from "./errors.js";
import { OverpassResponse } from "./types.js";

type CachedQuery = {
	request: string;
	value: string;
}

export class Database {
	private static database: IDBDatabase | null = Database.connect();

	private static connect() {
		const req = window.indexedDB.open("Overpass Data");

		req.onerror = () => Database.database = null;

		req.onupgradeneeded = () => {
			const database = req.result;
			database.createObjectStore("overpass-cache", { keyPath: "request" });
		}

		req.onsuccess = () => {
			const database = req.result;
			Database.database = database;
		}

		return null;
	}

	private static store(mode: IDBTransactionMode) {
		if (Database.database === null) return null;

		const transaction = Database.database.transaction("overpass-cache", mode);
		const store = transaction.objectStore("overpass-cache");
		return store;
	}

	static async get(key: string) {
		return promiseWrapper<OverpassResponse, AppErr>("db", new Promise((resolve, reject) => {
			const store = Database.store("readonly");
			if (store === null) return reject();
			const req = store.get(key);

			req.onerror = () => reject();

			req.onsuccess = () => {
				const data: CachedQuery | undefined = req.result;
				if (data === undefined) return reject();

				const json: OverpassResponse = JSON.parse(data.value);
				resolve(json);
			};
		}));
	}

	static async keys() {
		return promiseWrapper<Array<string>, AppErr>("db", new Promise((resolve, reject) => {
			const store = Database.store("readonly");
			if (store === null) return reject();
			const req = store.getAllKeys();

			req.onerror = () => reject();

			req.onsuccess = () => {
				const keys = req.result.map(key => key.toString());
				resolve(keys);
			};
		}));
	}

	static async insert(request: string, value: string) {
		return promiseWrapper<boolean, AppErr>("db", new Promise((resolve, reject) => {
			const store = Database.store("readwrite");
			if (store === null) return reject();
			const req = store.add({ request, value });

			req.onerror = reject;
			req.onsuccess = () => resolve(req.result !== undefined);
		})
		);
	}

	static async delete(key: string) {
		return promiseWrapper<boolean, AppErr>("db", new Promise((resolve, reject) => {
			const store = Database.store("readwrite");
			if (store === null) return reject();
			const req = store.delete(key);

			req.onerror = () => reject();
			req.onsuccess = () => resolve(true);
		})
		);
	}
}