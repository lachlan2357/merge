import { AppError, PROCESS_COMPLETE } from "./index.js";
import { cpSync, mkdirSync, rmSync } from "fs";

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
