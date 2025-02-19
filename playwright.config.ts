import { defineConfig, devices } from "@playwright/test";

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
		command: "yarn merge build && yarn merge deploy && serve -l 2357",
		url: "http://localhost:2357/merge",
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
