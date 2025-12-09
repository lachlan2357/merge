import { AppError } from "./index.ts";
import * as cmd from "./lib/cmd.ts";

/**
 * Deploy Merge from the `./dist` directory into the `./merge` directory, ready for GitHub Pages.
 *
 * @throws {AppError} If the deployment fails.
 */
export async function deploy() {
	try {
		await cmd.rm("merge", { recursive: true, force: true });
		await cmd.mkdir("merge", { recursive: true });
		await cmd.cp("dist", "merge", { recursive: true });
	} catch (e) {
		if (e instanceof Error) {
			throw new AppError(`Could not deploy Merge: ${e.message}`);
		} else {
			throw e;
		}
	}
}
