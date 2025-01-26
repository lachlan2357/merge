import build from "./build.js";
import deploy from "./deploy.js";
import dev from "./dev.js";
import process from "node:process";

// read cli arguments
const args = process.argv.splice(2);
if (args.length > 1)
	console.warn(
		"Warning: only the first argument passed is interpreted by Merge CLI. All other's are disregarded."
	);

// ensure a command was passed
const command = args[0];
if (command === undefined) {
	console.error("Error: No command specified, exiting.");
	process.exit(1);
}

// perform command
switch (command) {
	case "dev":
		await dev();
		break;
	case "build":
		build();
		break;
	case "deploy":
		deploy();
		break;
	default:
		console.error(`Error: unrecognised command ${command}.`);
}

process.exit(0);
