const { execSync } = require("child_process");
const { mkdirSync, rmSync, cpSync } = require("fs");

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync("src/pages", "dist", { recursive: true });
cpSync("assets", "dist", { recursive: true });
execSync("tsc");
execSync("sass src/style.scss:dist/style.css");