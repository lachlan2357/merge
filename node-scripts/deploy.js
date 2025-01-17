import { cpSync, mkdirSync, rmSync } from "fs";

try {
	rmSync("merge", { recursive: true, force: true });
	mkdirSync("merge", { recursive: true });
	cpSync("dist", "merge", { recursive: true });
} catch (e) {
	throw e.stdout.toString();
}
