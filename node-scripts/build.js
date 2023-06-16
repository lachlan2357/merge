import { execSync } from "child_process";
import { mkdirSync, rmSync, cpSync } from "fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync("src/pages", "dist", { recursive: true });
cpSync("assets", "dist", { recursive: true });
execSync("tsc");
execSync("sass src/style.scss:dist/style.css");
