import express from "express";
import { readFileSync } from "fs";
import * as process from "process";
import * as readline from "readline";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import { requestPathToFilePath } from "./lib/paths.ts";
import * as transformers from "./lib/transformers.ts";
import chokidar from "chokidar";
import { CacheMap } from "./lib/cache.ts";
import * as lib from "./lib/promise.ts";

// ensure dotenv is configured
dotenv.config();

/** Port declarations for the development server. */
const port = Object.freeze({
	/** The port the application will be hosted on, to visit in a browser. */
	server: Number(process.env.SERVE_PORT),
	/** The port the communication between server and application travel on. */
	websocket: Number(process.env.WS_PORT)
});

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
} as const;

const FILE_CACHE = new CacheMap();

/**
 * Open a development server with automatic change-reloading.
 *
 * @returns A {@link Promise} that resolves when this function completes.
 */
export async function dev() {
	// start reload listeners
	const ws = new WebSocketServer({ port: port.websocket });
	const sendReload = () => ws.clients.forEach(client => client.send("reload"));

	const watchers = [
		startHtmlListener(sendReload),
		startScssListener(sendReload),
		startSwcListener(sendReload),
		startAssetListener(sendReload)
	];

	// setup express server
	const app = express();

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
	app.get("/merge/styles/*", async (req, res) => {
		// find css file
		const relativePath = requestPathToFilePath(req.path);
		const path = `${PATHS.scss}/${relativePath}`;
		let body: string;

		// retrieve from cache or transform
		const fromCache = FILE_CACHE.get(path);
		if (fromCache !== undefined) body = fromCache;
		else body = await transformers.scss(path, FILE_CACHE);

		// send response
		res.status(200).contentType("text/css").send(body);
	});

	// serve js files
	app.get("/merge/scripts/*", async (req, res) => {
		// find ts file
		const relativePath = requestPathToFilePath(req.path);
		const path = `${PATHS.ts}/${relativePath}`;
		let body: string;

		// retrieve from cache or transform
		const fromCache = FILE_CACHE.get(path);
		if (fromCache !== undefined) body = fromCache;
		else body = await transformers.ts(path, FILE_CACHE);

		// send response
		res.status(200).contentType("text/javascript").send(body);
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
		if (event === "q" || event === "\x03") {
			Promise.all([
				lib.promisify(callback => ws.close(callback)),
				...watchers.map(watcher => watcher.close())
			])
				.then(() => resolve())
				.catch(reject);
		}
	});

	return promise;
}

/**
 * Start a listener to send an alert when any HTML files change.
 *
 * @param sendReload The function to call when a file change occurs.
 * @returns The HTML watcher.
 */
function startHtmlListener(sendReload: () => void) {
	return chokidar
		.watch(PATHS.html)
		.on("change", () => sendReload())
		.on("unlink", () => sendReload())
		.on("error", console.error);
}

/**
 * Start a scss watch compiler and listener to send an alert when any SCSS files change.
 *
 * @param sendReload The function to call when a file change occurs.
 * @returns The SCSS watcher.
 */
function startScssListener(sendReload: () => void) {
	return chokidar
		.watch(PATHS.scss)
		.on("change", path => {
			transformers
				.scss(path, FILE_CACHE)
				.then(() => sendReload())
				.catch(console.error);
		})
		.on("unlink", path => {
			FILE_CACHE.delete(path);
			sendReload();
		})
		.on("error", console.error);
}

/**
 * Start a watcher and listener to send an alert when any TypeScript files change.
 *
 * @param sendReload The function to call when a file change occurs.
 * @returns The TypeScript watcher.
 */
function startSwcListener(sendReload: () => void) {
	return chokidar
		.watch(PATHS.ts)
		.on("change", path => {
			transformers
				.ts(path, FILE_CACHE)
				.then(() => sendReload())
				.catch(console.error);
		})
		.on("unlink", path => {
			FILE_CACHE.delete(path);
			sendReload();
		})
		.on("error", console.error);
}

/**
 * Start a listener to send an alert when any asset files change.
 *
 * @param sendReload The function to call when a file change occurs.
 * @returns The asset watcher.
 */
function startAssetListener(sendReload: () => void) {
	return chokidar
		.watch(PATHS.assets)
		.on("change", () => sendReload())
		.on("unlink", () => sendReload())
		.on("error", console.error);
}
