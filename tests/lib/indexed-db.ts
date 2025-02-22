import { type CachedQuery } from "@/database.ts";
import type { Page } from "@playwright/test";

/**
 * Delete all IndexedDB databases.
 *
 * @param page The page to delete all databases on.
 */
export async function clearIndexedDb(page: Page) {
	await page.evaluate(async () => {
		const databases = await window.indexedDB.databases();
		for (const database of databases) {
			if (database.name !== undefined) window.indexedDB.deleteDatabase(database.name);
		}
	});
}

/**
 * Insert cached data into the database.
 *
 * @param page The page to insert the data on.
 * @param data The data to insert.
 */
export async function insertInto(page: Page, data: CachedQuery) {
	await page.evaluate(async data => {
		// @ts-expect-error path for project no test
		const toAwait = import("/merge/scripts/database.js") as Promise<
			typeof import("@/database.ts")
		>;
		const module = await toAwait;

		const database = await module.Database.connect().runAndThrow();
		await database.set(data).runAndThrow();
	}, data);
}
