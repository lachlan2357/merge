import { test, expect as baseExpect } from "@playwright/test";
import * as lib from "lib/index.ts";
import { localStorageExtensions } from "lib/extensions.ts";

const expect = baseExpect.extend(localStorageExtensions);

test.afterEach(async ({ page }) => {
	await lib.clearLocalStorage(page);
});

test.describe("colour scheme agnostic", () => {
	test.beforeEach(async ({ page }) => {
		await lib.navigateHome(page);
	});

	test("check localstorage set properly", async ({ page }) => {
		const defaultEndpoint = new URL("https://overpass-api.de/api/interpreter");

		await expect
			.soft(page, "left-hand-traffic should be false")
			.toHaveLocalStorageValue("left-hand-traffic", false);
		await expect
			.soft(page, "overpass-endpoint should be default")
			.toHaveLocalStorageValue("overpass-endpoint", defaultEndpoint);
		await expect
			.soft(page, "first-launch should be true")
			.toHaveLocalStorageValue("first-launch", true);
		await expect
			.soft(page, "ignore-cache should not be saved")
			.toHaveLocalStorageValue("ignore-cache", undefined);
	});

	test("first launch unset after popup dismissal", async ({ page }) => {
		// check pre-close
		await expect
			.soft(page, "first launch should be set before popup dismissal")
			.toHaveLocalStorageValue("first-launch", true);

		// check after popup closed
		await page.locator("#popup-close").click();
		await expect
			.soft(page, "first-launch should be cleared after popup dismissal")
			.toHaveLocalStorageValue("first-launch", false);
	});

	test("check settings menu and storage are in-sync", async ({ page }) => {
		// close welcome popup and open settings popup
		await page.locator("#popup-close").click();
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
		await expect
			.soft(page, "should detect as light mode")
			.toHaveLocalStorageValue("dark-mode", false);

		const html = page.locator("html");
		await expect.soft(html).toHaveAttribute("data-dark-mode", "false");
	});
});

test.describe("dark mode ui", () => {
	test.beforeEach(async ({ page }) => {
		await lib.setColourScheme(page, "dark");
		await lib.navigateHome(page);
	});

	test("dark mode detection on load", async ({ page }) => {
		await expect
			.soft(page, "should detect as dark mode")
			.toHaveLocalStorageValue("dark-mode", true);

		const html = page.locator("html");
		await expect.soft(html).toHaveAttribute("data-dark-mode", "true");
	});
});
