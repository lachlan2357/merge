import { AppError } from "./index.ts";
import { cpSync, mkdirSync, rmSync } from "fs";

/**
 * Deploy Merge from the `dist` directory into the `merge` directory, ready for GitHub Pages.
 *
 * @throws {AppError} If the deployment fails.
 */
export default function () {
	try {
		rmSync("merge", { recursive: true, force: true });
		mkdirSync("merge", { recursive: true });
		cpSync("dist", "merge", { recursive: true });
	} catch (e) {
		if (e instanceof Error) {
			throw new AppError(`Could not deploy Merge: ${e.message}`);
		} else {
			throw e;
		}
	}
}
