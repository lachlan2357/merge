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
function sendReload() {
	ws.clients.forEach(client => client.send("reload"));
}

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
	waiting: "./cli/pages/waiting.html",
	tempCss: "./cli/temp_css",
	tempJs: "./cli/temp_js",
	tempJsSwc: `./cli/temp_js/scripts`,
	tsConfig: "./tsconfig.json"
};

/** Whether all components have been initialised as the project is ready to be served. */
let allInitialised = false;

/**
 * Open a development server with automatic change-reloading.
 *
 * @returns A {@link Promise} that resolves when this function completes.
 */
export default async function () {
	const app = express();

	// waiting page for when project is still compiling
	app.get("*", (req, res, next) => {
		if (allInitialised) return next();

		// send waiting page
		const file = readFileSync(PATHS.waiting).toString();
		const injectedFile = file.replace("</body>", jsInject);
		res.send(injectedFile);
	});

	// redirect `/` to `/merge/index.html`
	app.get("/", (req, res) => {
		res.redirect("/merge/index.html");
	});

	// serve html files
	app.get("/merge/:filename.html", (req, res) => {
		const filename = req.params["filename"];
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
	const serverStart = Promise.withResolvers<void>();
	app.listen(port.server, () => {
		console.log(`Listening on port ${port.server}.`);
		console.log("Enter 'q' to exit");
		serverStart.resolve();
	});
	await serverStart.promise;

	// setup readline to detect keypresses of 'q' or 'ctrl + c' to quit
	const { promise, resolve, reject } = Promise.withResolvers<void>();
	readline.emitKeypressEvents(process.stdin);
	if (process.stdin.isTTY) process.stdin.setRawMode(true);

	process.stdin.addListener("keypress", event => {
		if (event === "q" || event === "\x03") resolve();
	});

	// start recompilation listeners, waiting for them to finish before starting server
	const htmlStart = startHtmlListener();
	const cssStart = startScssListener();
	const tscStart = startSwcListener();
	const assetStart = startAssetListener();
	Promise.all([htmlStart, cssStart, tscStart, assetStart])
		.then(() => {
			console.log("All initialised.");
			allInitialised = true;
			sendReload();
		})
		.catch(error => reject(error));

	return promise;
}

/**
 * Start a listener to send an alert when any HTML files change.
 *
 * @returns A {@link Promise} that resolves when this listener is initialised.
 */
function startHtmlListener() {
	const watcher = watch(PATHS.html, { recursive: true });
	watcher.addListener("change", () => sendReload());

	console.log("> HTML initialised.");
	return Promise.resolve();
}

const scssWatching = /^Sass is watching for changes\. Press Ctrl-C to stop\.$/;
const scssRecompiled = /\[[^\]]+\] Compiled .+?\.scss to (.+\.css)\./;

/**
 * Start a scss watch compiler and listener to send an alert when any SCSS files change.
 *
 * @returns A {@link Promise} that resolves when this listener is initialised.
 */
function startScssListener() {
	// setup promise for initialisation
	const { promise, resolve } = Promise.withResolvers<void>();

	// remove any previously compiled files from the directory
	rmSync(PATHS.tempCss, { recursive: true, force: true });

	const process = exec(`sass --watch ${PATHS.scss}:${PATHS.tempCss} --no-source-map`);
	process.stdout.on("data", data => {
		if (typeof data !== "string") return;
		const stdout = data.trim();

		if (scssWatching.test(stdout)) {
			console.log("> SCSS initialised.");
			resolve();
			return;
		}

		const scssMatch = scssRecompiled.exec(stdout);
		if (scssMatch !== null && allInitialised) {
			console.log("SCSS re-generated.");
			sendReload();
		}
	});

	return promise;
}

const swcCompiled = /^Successfully compiled: (\d+) files with swc \([^)]+\)$/;
const swcCompileFailed = /^Failed to compile (\d+) files with swc.$/;
const swcCompiledFile = /^Successfully compiled ([^ ]+) with swc \([^)]+\)$/;

/**
 * Start a watcher and listener to send an alert when any TypeScript files change.
 *
 * @returns A {@link Promise} that resolves when this listener is initialised.
 */
function startSwcListener() {
	// setup promise for initialisation
	const { promise, resolve } = Promise.withResolvers<void>();

	// remove any previously compiled files from the directory
	rmSync(PATHS.tempJs, { recursive: true, force: true });

	const process = exec(`yarn swc ${PATHS.ts} -d ${PATHS.tempJs}  --strip-leading-paths --watch`);

	process.stdout.on("data", data => {
		if (typeof data !== "string") return;
		const stdout = data.trim();

		if (stdout === "Watching for file changes.") {
			console.log("> SWC initialised.");
			resolve();
		}
	});

	process.stderr.on("data", data => {
		if (!allInitialised) return;
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
			console.error("SWC detected an error while compiling.");
		}
	});

	return promise;
}

/**
 * Start a listener to send an alert when any asset files change.
 *
 * @returns A {@link Promise} that resolves when this listener is initialised.
 */
function startAssetListener() {
	const watcher = watch(PATHS.assets, { recursive: true });
	watcher.addListener("change", () => sendReload());

	console.log("> Assets initialised.");
	return Promise.resolve();
}
