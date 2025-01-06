import { execSync } from "child_process";
import { cpSync, mkdirSync, rmSync } from "fs";

try {
	rmSync("dist", { recursive: true, force: true });
	mkdirSync("dist", { recursive: true });
	cpSync("src/pages", "dist", { recursive: true });
	cpSync("assets", "dist", { recursive: true });
	execSync("tsc");
	execSync("sass src/styles:dist/styles --no-source-map");
} catch (e) {
	throw e.stdout.toString();
}
