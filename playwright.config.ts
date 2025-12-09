import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

const UNIT_TESTS = "**/*.test.ts";
const BROWSER_TESTS = "**/*.spec.ts";

export default defineConfig({
	// test discovery
	testDir: "./tests/",

	// application setup
	use: {
		baseURL: "http://localhost:2357/merge",
		trace: process.env.CI ? "on-first-retry" : "on"
	},
	webServer: {
		command: "yarn merge preview",
		url: `http://localhost:${process.env.PREVIEW_PORT}/merge`,
		reuseExistingServer: !process.env.CI
	},

	// parallelism
	fullyParallel: true,
	workers: process.env.CI ? 1 : undefined,

	// ci-specific settings
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,

	// results reporter
	reporter: "html",

	// projects to test
	projects: [
		{
			name: "unit-tests",
			use: undefined,
			testMatch: [UNIT_TESTS]
		},
		{
			name: "chromium",
			use: devices["Desktop Chrome"],
			testMatch: [BROWSER_TESTS]
		},
		{
			name: "firefox",
			use: devices["Desktop Firefox"],
			testMatch: [BROWSER_TESTS]
		},
		{
			name: "webkit",
			use: devices["Desktop Safari"],
			testMatch: [BROWSER_TESTS]
		}
	]
});
