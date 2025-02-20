import { AppError } from "./index.ts";
import { execSync } from "child_process";
import { cpSync, mkdirSync, rmSync } from "fs";

/**
 * Build Merge into the `dist` directory.
 *
 * @throws {AppError} If the build fails.
 */
export default function () {
	try {
		rmSync("dist", { recursive: true, force: true });
		mkdirSync("dist", { recursive: true });
		cpSync("src/pages", "dist", { recursive: true });
		cpSync("assets", "dist", { recursive: true });
		execSync("tsc");
		execSync("sass src/styles:dist/styles --no-source-map");
	} catch (error) {
		if (error instanceof Error) {
			throw new AppError(`Could not build Merge: ${error.message}`);
		} else {
			throw error;
		}
	}
}
