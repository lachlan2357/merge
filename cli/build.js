import { AppError, PROCESS_COMPLETE } from "./index.js";
import { execSync } from "child_process";
import { cpSync, mkdirSync, rmSync } from "fs";

/** Build Merge into the `dist` directory. */
export default function () {
	try {
		rmSync("dist", { recursive: true, force: true });
		mkdirSync("dist", { recursive: true });
		cpSync("src/pages", "dist", { recursive: true });
		cpSync("assets", "dist", { recursive: true });
		execSync("tsc");
		execSync("sass src/styles:dist/styles --no-source-map");
	} catch (e) {
		if (e instanceof Error) {
			throw new AppError(e.message);
		} else {
			throw e;
		}
	}

	throw PROCESS_COMPLETE;
}
