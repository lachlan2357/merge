import { CachedQuery, OverpassResponse } from "../index.js";

let db: IDBDatabase;
const openIDB = window.indexedDB.open("Overpass Data");

openIDB.onerror = e => console.error((e.target as IDBOpenDBRequest).error);

openIDB.onupgradeneeded = e => {
	const tempDB = (e.target as IDBOpenDBRequest).result;
	tempDB.createObjectStore("overpass-cache", { keyPath: "request" });
};

openIDB.onsuccess = e => (db = (e.target as IDBOpenDBRequest).result);

export function getAllCacheKeys() {
	return new Promise<string[]>(resolve => {
		const transaction = db.transaction("overpass-cache", "readonly");
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
		const transaction = db.transaction("overpass-cache", "readonly");
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
		const transaction = db.transaction("overpass-cache", "readwrite");
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
		const transaction = db.transaction("overpass-cache", "readwrite");
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
