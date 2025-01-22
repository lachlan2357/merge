import dev from "./dev.js";
import process from "node:process";

// read cli arguments
const args = process.argv.splice(2);
if (args.length > 1)
	console.warn(
		"Warning: only the first argument passed is interpreted by Merge CLI. All other's are disregarded."
	);

// ensure command was parsed
const command = args[0];
if (command === undefined) {
	console.error("Error: No command specified, exiting.");
	process.exit(1);
}

// perform command
switch (command) {
	case "dev":
		dev();
		break;
	default:
		console.error(`Error: unrecognised command ${command}.`);
}
