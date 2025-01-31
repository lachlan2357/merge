import build from "./build.js";
import deploy from "./deploy.js";
import dev from "./dev.js";
import process from "node:process";

/**
 * CLI Application entrypoint.
 */
async function main() {
	// read cli arguments
	const args = process.argv.splice(2);
	if (args.length > 1)
		console.warn(
			"Warning: only the first argument passed is interpreted by Merge CLI. All other's are disregarded."
		);

	// ensure a command was passed
	const command = args[0];
	if (command === undefined) throw new AppError("No command specified.");

	// perform command
	switch (command) {
		case "dev": {
			return await dev();
		}
		case "build":
			return build();
		case "deploy":
			return deploy();
		default:
			throw new Error(`Unrecognised command ${command}.`);
	}
}

/**
 * Symbol to be thrown whenever a command process wishes to exit the process.
 *
 * This must be thrown by all processes explicitly otherwise there is a high chance the application
 * will be left in a state where nothing will happen, but it will not exit.
 */
export const PROCESS_COMPLETE = Symbol("Process complete");

/**
 * Error type to be used by the application to differentiate between errors that are predicable.
 */
export class AppError extends Error {}

process.addListener("uncaughtException", e => {
	if (e === PROCESS_COMPLETE) {
		process.exit(0);
	} else if (e instanceof AppError) {
		console.error("Error: ", e.message);
		process.exit(1);
	} else {
		throw e;
	}
});

await main();
