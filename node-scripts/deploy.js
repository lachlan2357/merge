import { mkdirSync, rmSync, cpSync } from "fs";

rmSync("merge", { recursive: true, force: true });
mkdirSync("merge", { recursive: true });
cpSync("dist", "merge", { recursive: true });
