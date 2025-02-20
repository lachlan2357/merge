import build from "./build.ts";
import deploy from "./deploy.ts";
import dev from "./dev.ts";
import process from "node:process";

/**
 * CLI Application entrypoint.
 *
 * @returns A {@link Promise} that will be resolved once the application completes.
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
		case "dev":
			return await dev();
		case "build":
			return build();
		case "deploy":
			return deploy();
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
