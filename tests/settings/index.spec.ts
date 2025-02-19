import { test, expect } from "@playwright/test";
import * as lib from "../lib.ts";

test.afterEach(async ({ page }) => {
	await lib.clearLocalStorage(page);
});

test.describe("colour scheme agnostic", () => {
	test.beforeEach(async ({ page }) => {
		await lib.navigateHome(page);
	});

	test("check localstorage set properly", async ({ page }) => {
		const ls = await page.evaluate(() => localStorage);
		const endpoint = new URL("https://overpass-api.de/api/interpreter").toString();

		expect.soft(ls["left-hand-traffic"], "left-hand-traffic should be false").toBe("false");
		expect.soft(ls["overpass-endpoint"], "overpass-endpoint should be default").toBe(endpoint);
		expect.soft(ls["first-launch"], "first-launch should be true").toBe("true");
		expect.soft(ls["ignore-cache"], "ignore-cache should not be saved").toBe(undefined);
	});

	test("check settings menu and storage are in-sync", async ({ page }) => {
		// close welcome popup
		await page.locator("#popup-close").click();

		// open settings popup
		await page.locator("#settings").click();

		// find all `<popup-container>`s
		const containers = await page.locator("#popup").locator("popup-container").all();

		const settingsOrder = [
			"left-hand-traffic",
			"overpass-endpoint",
			"ignore-cache",
			"dark-mode"
		] as const;

		const notPersistent = ["ignore-cache"];

		for (let i = 0; i < containers.length; i++) {
			const settingsKey = settingsOrder[i];
			const container = containers[i];
			if (settingsKey === undefined || container === undefined) continue;
			if (notPersistent.includes(settingsKey)) continue;

			const input = container.locator("input");
			const inputType = await input.getAttribute("type");

			switch (inputType) {
				case "checkbox": {
					await lib.checkCheckbox(page, input, settingsKey);
					break;
				}
				case "url": {
					await lib.checkUrl(page, input, settingsKey);
					break;
				}
				default:
					throw new TypeError(`'${inputType}' does not have any recognised test cases.`);
			}
		}
	});
});

test.describe("light mode ui", () => {
	test.beforeEach(async ({ page }) => {
		await lib.setColourScheme(page, "light");
		await lib.navigateHome(page);
	});

	test("light mode detection on load", async ({ page }) => {
		const ls = await lib.getLocalStorage(page);
		expect.soft(ls["dark-mode"], "should detect as light mode").toBe("false");
	});
});

test.describe("dark mode ui", () => {
	test.beforeEach(async ({ page }) => {
		await lib.setColourScheme(page, "dark");
		await lib.navigateHome(page);
	});

	test("dark mode detection on load", async ({ page }) => {
		const ls = await lib.getLocalStorage(page);
		expect.soft(ls["dark-mode"], "should detect as dark mode").toBe("true");
	});
});
