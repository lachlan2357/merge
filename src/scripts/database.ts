import { AppErr, promiseWrapper } from "./errors.js";
import { database } from "./index.js";
import { nullish } from "./supplement.js";
import { CachedQuery, OverpassResponse } from "./types.js";

export async function getAllCacheKeys() {
	return promiseWrapper<Array<string>, AppErr>(
		"db",
		new Promise((resolve, reject) => {
			const transaction = database.transaction(
				"overpass-cache",
				"readonly"
			);
			const objectStore = transaction.objectStore("overpass-cache");
			const transactionRequest = objectStore.getAllKeys();

			transactionRequest.onerror = reject;
			transactionRequest.onsuccess = function () {
				resolve(this.result.map(key => key.toString()));
			};
		})
	);
}

export async function getCachedFor(key: string) {
	return promiseWrapper<OverpassResponse, AppErr>(
		"db",
		new Promise((resolve, reject) => {
			const transaction = database.transaction(
				"overpass-cache",
				"readonly"
			);
			const objectStore = transaction.objectStore("overpass-cache");
			const transactionRequest = objectStore.get(key);

			transactionRequest.onerror = reject;
			transactionRequest.onsuccess = function () {
				const result: CachedQuery | undefined = this.result;
				if (nullish(result)) return reject();

				const json: OverpassResponse = JSON.parse(result.value);
				resolve(json);
			};
		})
	);
}

export function insertInto(request: string, value: string) {
	return promiseWrapper<boolean, AppErr>(
		"db",
		new Promise<boolean>((resolve, reject) => {
			const transaction = database.transaction(
				"overpass-cache",
				"readwrite"
			);
			const objectStore = transaction.objectStore("overpass-cache");
			const transactionRequest = objectStore.add({ request, value });

			transactionRequest.onerror = reject;
			transactionRequest.onsuccess = function () {
				resolve(this.result !== undefined);
			};
		})
	);
}

export function deleteEntry(key: string) {
	return promiseWrapper<boolean, AppErr>(
		"db",
		new Promise<boolean>((resolve, reject) => {
			const transaction = database.transaction(
				"overpass-cache",
				"readwrite"
			);
			const objectStore = transaction.objectStore("overpass-cache");
			const transactionRequest = objectStore.delete(key);

			transactionRequest.onerror = reject;
			transactionRequest.onsuccess = function () {
				resolve(true);
			};
		})
	);
}
