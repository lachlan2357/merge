import { CachedQuery, OverpassResponse } from "../index.js";
import { database } from "../script.js";

export function getAllCacheKeys() {
	return new Promise<string[]>(resolve => {
		const transaction = database.transaction("overpass-cache", "readonly");
		const objectStore = transaction.objectStore("overpass-cache");
		const transactionRequest = objectStore.getAllKeys();

		transactionRequest.onerror = e => {
			console.error(`Error: ${(e.target as IDBRequest).error}`);
		};

		transactionRequest.onsuccess = e => {
			resolve((e.target as IDBRequest).result);
		};
	});
}

export function getCachedFor(key: string) {
	return new Promise<OverpassResponse>(resolve => {
		const transaction = database.transaction("overpass-cache", "readonly");
		const objectStore = transaction.objectStore("overpass-cache");
		const transactionRequest = objectStore.get(key);

		transactionRequest.onerror = e => {
			console.error(`Error: ${(e.target as IDBRequest).error}`);
		};

		transactionRequest.onsuccess = e => {
			const result: CachedQuery = (e.target as IDBRequest).result;
			const json: OverpassResponse = JSON.parse(result.value);
			resolve(json);
		};
	});
}

export function insertInto(request: string, value: string) {
	return new Promise<boolean>(resolve => {
		const transaction = database.transaction("overpass-cache", "readwrite");
		const objectStore = transaction.objectStore("overpass-cache");
		const transactionRequest = objectStore.add({
			request: request,
			value: value
		});

		transactionRequest.onerror = e => {
			console.error(`Error: ${(e.target as IDBRequest).error}`);
			resolve(false);
		};

		transactionRequest.onsuccess = () => {
			resolve(true);
		};
	});
}

export function deleteEntry(key: string) {
	return new Promise<boolean>(resolve => {
		const transaction = database.transaction("overpass-cache", "readwrite");
		const objectStore = transaction.objectStore("overpass-cache");
		const transactionRequest = objectStore.delete(key);

		transactionRequest.onerror = e => {
			console.error(`Error: ${(e.target as IDBRequest).error}`);
			resolve(false);
		};

		transactionRequest.onsuccess = () => {
			resolve(true);
		};
	});
}
