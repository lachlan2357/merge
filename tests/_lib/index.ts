import { expect, type Locator, type Page } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

/**
 * Navigate a {@link page} back to home, refreshing it in the process.
 *
 * @param page The page to navigate.
 */
export async function navigateHome(page: Page) {
	await page.goto(`http://localhost:${process.env["PREVIEW_PORT"]}/merge/index.html`);
}

/**
 * Retrieve the {@link localStorage} object of a {@link page}.
 *
 * Note: while all properties of {@link localStorage} (i.e., set values) are returned, functions are
 * not, and cannot be called.
 *
 * @param page The page to retrieve {@link localStorage} from.
 * @returns The {@link localStorage} object from the {@link page}.
 */
export async function getLocalStorage(page: Page) {
	return (await page.evaluate(() => localStorage)) as Record<string, string | undefined>;
}

/**
 * Clear the contents of the {@link localStorage} of a {@link page}.
 *
 * @param page The page to clear the {@link localStorage} of.
 */
export async function clearLocalStorage(page: Page) {
	await page.evaluate(() => localStorage.clear());
}

/**
 * Set the colour scheme of a {@link page}.
 *
 * @param page The page to set the colour scheme of.
 * @param colourScheme The colour scheme to set.
 */
export async function setColourScheme(page: Page, colourScheme: "light" | "dark") {
	await page.emulateMedia({ colorScheme: colourScheme });
}

/**
 * Check that a checkbox's value matches that stored in {@link localStorage}.
 *
 * @param page The page to fetch {@link localStorage} from.
 * @param input The checkbox to check.
 * @param settingsKey The key used to store the value controlled by {@link input}.
 */
export async function checkCheckbox(page: Page, input: Locator, settingsKey: string) {
	// check current state
	let ls = await getLocalStorage(page);
	let checked = stringToBoolean(ls[settingsKey]);
	await expect.soft(input, "checked should match stored").toBeChecked({ checked });

	// change state and check again
	await input.click();
	ls = await getLocalStorage(page);
	checked = stringToBoolean(ls[settingsKey]);
	await expect.soft(input, "checked should match stored after change").toBeChecked({ checked });
}

/**
 * Convert a string to a boolean.
 *
 * @param string The string to convert.
 * @returns The converted boolean.
 * @throws {string} If {@link string} could not be converted.
 */
function stringToBoolean(string: string | undefined) {
	switch (string) {
		case "true":
			return true;
		case "false":
			return false;
		default:
			throw new TypeError(`Cannot convert ${string} to boolean.`);
	}
}

/**
 * Check that a url input's value matches that stored in {@link localStorage}.
 *
 * @param page The page to fetch {@link localStorage} from.
 * @param input The url input to check.
 * @param settingsKey The key used to store the value controlled by {@link input}.
 */
export async function checkUrl(page: Page, input: Locator, settingsKey: string) {
	// check current state
	let ls = await getLocalStorage(page);
	let value = ls[settingsKey];
	if (value === undefined)
		throw new TypeError(
			`Value retrieved from 'localStorage' for ${settingsKey} is 'undefined'`
		);
	await expect.soft(input).toHaveValue(value);

	// change state and check again
	await input.fill("https://www.example.com");
	ls = await getLocalStorage(page);
	value = ls[settingsKey];
	if (value === undefined)
		throw new TypeError(
			`Value retrieved from 'localStorage' for ${settingsKey} is 'undefined'`
		);
	await expect.soft(input).toHaveValue(value);
}
