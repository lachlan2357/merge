import process from "process";
import dotenv from "dotenv";

import { dev } from "./dev.ts";
import { build } from "./build.ts";
import { deploy } from "./deploy.ts";
import { serve } from "./serve.ts";

/**
 * CLI Application entrypoint.
 *
 * @returns A {@link Promise} that will be resolved once the application completes.
 */
async function main() {
	// load dotenv
	dotenv.config();

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
			await dev();
			break;
		}
		case "build": {
			await build();
			break;
		}
		case "deploy": {
			await deploy();
			break;
		}
		case "preview": {
			await build();
			await deploy();
			await serve();
			break;
		}
		default:
			throw new Error(`Unrecognised command ${command}.`);
	}
}

/** Error type to be used by the application to differentiate between errors that are predicable. */
export class AppError extends Error {}

process.addListener("uncaughtException", error => {
	if (error instanceof AppError) {
		console.error(error);
		process.exit(1);
	} else {
		throw error;
	}
});

await main();
process.exit(0);
