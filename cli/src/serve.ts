import * as cmd from "./lib/cmd.ts";

const port = Number(process.env.PREVIEW_PORT);

/**
 * Serve Merge from the `./merge` directory.
 *
 * @throws {AppError} If the build fails.
 */
export async function serve() {
	console.log(`Merge is served at http://localhost:${[port]}`);
	await cmd.exec(`yarn serve -l ${port}`);
}
