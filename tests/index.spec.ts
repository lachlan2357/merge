import { expect, test } from "@playwright/test";
import * as lib from "lib/index.ts";
import * as idb from "lib/indexed-db.ts";
import type { OverpassResponse } from "@/overpass/structures.ts";

test.beforeEach(async ({ page }) => {
	await lib.navigateHome(page);
});

test.afterEach(async ({ page }) => {
	await idb.clearIndexedDb(page);
});

test.describe("url hash behaviour", () => {
	test("should be unset on page load", ({ page }) => {
		// get hash from url
		const urlString = page.url();
		const hash = new URL(urlString).hash;

		expect(hash, "should be empty string").toBe("");
	});

	test("should be set to relation ID on successful search", async ({ page }) => {
		// immediately abort any public web requests
		await page.route("https://*.*/*", route => route.abort());

		// insert fake data
		const relationId = 0;
		const data = {
			request: `<osm-script output="json"><union><query type="relation"><id-query type="relation" ref="${relationId}"/></query><recurse type="relation-way"/><recurse type="way-node"/><recurse type="node-way"/></union><print/></osm-script>`,
			value: JSON.stringify({
				version: 1.0,
				generator: "Playwright Testing",
				osm3s: {
					timestamp_osm_base: "1970-01-01T00:00:00Z",
					copyright: "This data has bee mimicked for Playwright testing."
				},
				elements: [
					{
						type: "relation",
						id: relationId,
						members: []
					}
				]
			} as OverpassResponse)
		};
		await idb.insertInto(page, data);

		// close welcome popup
		await page.locator("#popup-close").click();

		// input search term
		await page.locator("#relation-name").fill(relationId.toString());

		// click search and wait for search to complete
		await page.locator("#search-form").locator("button[type=submit]").click();
		await page.locator("fa-icon[icon=magnifying-glass]").waitFor();

		// get hash from url
		const urlString = page.url();
		const hash = new URL(urlString).hash;

		expect(hash, "should equal current relation id").toBe(`#${relationId}`);
	});
});
