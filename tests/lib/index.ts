import type { Page } from "@playwright/test";
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
 * Set the colour scheme of a {@link page}.
 *
 * @param page The page to set the colour scheme of.
 * @param colourScheme The colour scheme to set.
 */
export async function setColourScheme(page: Page, colourScheme: "light" | "dark") {
	await page.emulateMedia({ colorScheme: colourScheme });
}
