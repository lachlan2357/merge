import { AppError, PROCESS_COMPLETE } from "./index.js";
import { cpSync, mkdirSync, rmSync } from "fs";

/**
 * Deploy Merge from the `dist` directory into the `merge` directory, ready for GitHub Pages.
 */
export default function () {
	try {
		rmSync("merge", { recursive: true, force: true });
		mkdirSync("merge", { recursive: true });
		cpSync("dist", "merge", { recursive: true });
	} catch (e) {
		if (e instanceof Error) {
			throw new AppError(e.message);
		} else {
			throw e;
		}
	}

	throw PROCESS_COMPLETE;
}
