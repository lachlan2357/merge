import { defineConfig, devices } from "@playwright/test";

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
			name: "chromium",
			use: devices["Desktop Chrome"]
		},
		{
			name: "firefox",
			use: devices["Desktop Firefox"]
		},
		{
			name: "webkit",
			use: devices["Desktop Safari"]
		}
	]
});
