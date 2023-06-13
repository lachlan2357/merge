const { mkdirSync, rmSync, cpSync } = require("fs");

rmSync("merge", { recursive: true, force: true });
mkdirSync("merge", { recursive: true });
cpSync("dist", "merge", { recursive: true });