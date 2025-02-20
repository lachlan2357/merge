import { PROCESS_COMPLETE } from "./index.js";
import { exec } from "child_process";
import express from "express";
import { readFileSync, rmSync, watch } from "fs";
import * as process from "process";
import * as readline from "readline";
import { WebSocketServer } from "ws";

/** Port declarations for the development server. */
const port = Object.freeze({
	/** The port the application will be hosted on, to visit in a browser. */
	server: 3000,
	/** The port the communication between server and application travel on. */
	websocket: 3001
});

/** The websocket server used to communicate to the application to alert it when to reload. */
const ws = new WebSocketServer({ port: port.websocket });

/** Alert all websocket instances of the application to reload their page as updates have occurred. */
const sendReload = () => ws.clients.forEach(client => client.send("reload"));

/** JavaScript code to inject into the HTML file in order for automatic reloading to function. */
const jsInject = `
	<script>
		const ws = new WebSocket("ws://localhost:${port.websocket}");
		ws.addEventListener("message", event => {
			const message = event.data.toString();
			if (message === "reload") window.location.reload();
		});
	</script>
</body>`;

/** All base-paths for various file/folder locations. */
const PATHS = {
	html: "./src/pages",
	scss: "./src/styles",
	ts: "./src/scripts",
	assets: "./assets",
	tempCss: "./cli/temp_css",
	tempJs: "./cli/temp_js",
	tempJsSwc: `./cli/temp_js/scripts`,
	tsConfig: "./tsconfig.json"
};

/** Open a development server with automatic change-reloading. */
export default async function () {
	// start recompilation listeners, waiting for them to finish before starting server
	const htmlStart = startHtmlListener();
	const cssStart = startScssListener();
	const tscStart = startSwcListener();
	const assetStart = startAssetListener();
	await Promise.all([htmlStart, cssStart, tscStart, assetStart]);

	const app = express();

	// redirect `/` to `/merge/index.html`
	app.get("/", (req, res) => {
		res.redirect("/merge/index.html");
	});

	// serve html files
	app.get("/merge/:filename.html", (req, res) => {
		const filename = req.params["filename"];
		// res.sendFile(`${filename}.html`, { root: "../src/pages" });
		const file = readFileSync(`${PATHS.html}/${filename}.html`).toString();

		// inject ws into page
		const injectedFile = file.replace("</body>", jsInject);
		res.send(injectedFile);
	});

	// serve css files
	app.get("/merge/styles/:filename.css", (req, res) => {
		const path = req.path.split("/").splice(3).join("/");
		res.sendFile(path, { root: PATHS.tempCss });
	});

	// serve js files
	app.get("/merge/scripts/*", (req, res) => {
		const path = req.path.split("/").splice(3).join("/");
		res.sendFile(path, { root: PATHS.tempJsSwc });
	});

	// serve asset files
	app.get("/merge/*", (req, res) => {
		const path = req.path.split("/").splice(2).join("/");
		res.sendFile(path, { root: PATHS.assets });
	});

	// 404 not found
	app.get("*", (req, res) => {
		res.send(404);
	});

	// host server
	app.listen(port.server, () => {
		console.log(`Listening on port ${port.server}.`);
		console.log("Enter 'q' to exit");
	});

	// setup readline to detect keypresses of 'q' or 'ctrl + c' to quit
	readline.emitKeypressEvents(process.stdin);
	if (process.stdin.isTTY) process.stdin.setRawMode(true);

	process.stdin.addListener("keypress", event => {
		if (event === "q" || event === "\x03") throw PROCESS_COMPLETE;
	});
}

function startHtmlListener() {
	const watcher = watch(PATHS.html, { recursive: true });
	watcher.addListener("change", () => sendReload());

	console.log("HTML initialised.");
	return Promise.resolve();
}

let scssInitialised = false;
const scssWatching = /^Sass is watching for changes\. Press Ctrl-C to stop\.$/;
const scssRecompiled = /\[[^\]]+\] Compiled .+?\.scss to (.+\.css)\./;

function startScssListener() {
	// setup promise for initialisation
	const { promise, resolve } = Promise.withResolvers();

	// remove any previously compiled files from the directory
	rmSync(PATHS.tempCss, { recursive: true, force: true });

	const process = exec(`sass --watch ${PATHS.scss}:${PATHS.tempCss} --no-source-map`);
	process.stdout.on("data", data => {
		if (typeof data !== "string") return;
		const stdout = data.trim();

		if (scssWatching.test(stdout)) {
			console.log("SCSS initialised.");
			scssInitialised = true;
			resolve();
			return;
		}

		const scssMatch = scssRecompiled.exec(stdout);
		if (scssMatch !== null && scssInitialised) {
			console.log("SCSS re-generated.");
			sendReload();
		}
	});

	return promise;
}

let tscInitialised = false;

const swcCompiled = /^Successfully compiled: (\d+) files with swc \([^\)]+\)$/;
const swcCompileFailed = /^Failed to compile (\d+) files with swc.$/;
const swcCompiledFile = /^Successfully compiled ([^ ]+) with swc \([^\)]+\)$/;

function startSwcListener() {
	// setup promise for initialisation
	const { promise, resolve } = Promise.withResolvers();

	// remove any previously compiled files from the directory
	rmSync(PATHS.tempJs, { recursive: true, force: true });

	const process = exec(`yarn swc ${PATHS.ts} -d ${PATHS.tempJs}  --strip-leading-paths --watch`);

	process.stdout.on("data", data => {
		if (typeof data !== "string") return;
		const stdout = data.trim();

		if (stdout === "Watching for file changes.") {
			console.log("SWC initialised");
			tscInitialised = true;
			resolve();
		}
	});

	process.stderr.on("data", data => {
		if (typeof data !== "string") return;
		const stderr = data.trim();

		const swcFile = swcCompiledFile.exec(stderr);
		const swcFiles = swcCompiled.exec(stderr);
		const swcFilesFailed = swcCompileFailed.exec(stderr);

		if (swcFiles !== null) {
			console.log(`SWC successfully built ${swcFiles[1]} files.`);
			sendReload();
		} else if (swcFile !== null) {
			console.log("SWC successfully built 1 file.");
			sendReload();
		} else if (swcFilesFailed !== null) {
			console.log(`SWC failed to compile ${swcFilesFailed[1]} files.`);
		} else {
			console.error("SWC detected an error while compiling");
		}
	});

	return promise;
}

function startAssetListener() {
	const watcher = watch(PATHS.assets, { recursive: true });
	watcher.addListener("change", () => sendReload());

	console.log("Assets initialised.");
	return Promise.resolve();
}
