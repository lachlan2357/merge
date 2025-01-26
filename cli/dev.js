import { exec } from "child_process";
import express from "express";
import { readFileSync, rmSync, watch } from "fs";
import { WebSocketServer } from "ws";

const serverPort = 3000;
const websocketPort = 3001;

const ws = new WebSocketServer({ port: websocketPort });
const sendReload = () => ws.clients.forEach(client => client.send("reload"));

/**
 * JavaScript code to inject into the HTML file in order for automatic reloading to function.
 */
const jsInject = `
	<script>
		const ws = new WebSocket("ws://localhost:${websocketPort}");
		ws.addEventListener("message", event => {
			const message = event.data.toString();
			if (message === "reload") window.location.reload();
		});
	</script>
</body`;

export default async function dev() {
	// start recompilation listeners, waiting for them to finish before starting server
	const htmlStart = startHtmlListener();
	const cssStart = startScssListener();
	const tscStart = startTscListener();
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
		const file = readFileSync(`../src/pages/${filename}.html`).toString();

		// inject ws into page
		const injectedFile = file.replace("</body>", jsInject);
		res.send(injectedFile);
	});

	// serve css files
	app.get("/merge/styles/:filename.css", (req, res) => {
		const path = req.path.split("/").splice(3).join("/");
		res.sendFile(path, { root: "./temp_css" });
	});

	// serve js files
	app.get("/merge/scripts/*", (req, res) => {
		const path = req.path.split("/").splice(3).join("/");
		res.sendFile(path, { root: "./temp_js" });
	});

	// serve asset files
	app.get("/merge/*", (req, res) => {
		const path = req.path.split("/").splice(2).join("/");
		res.sendFile(path, { root: "../assets" });
	});

	// 404 not found
	app.get("*", (req, res) => {
		res.send(404);
	});

	app.listen(serverPort, () => {
		console.log(`Listening on port ${serverPort}.`);
	});
}

function startHtmlListener() {
	const watcher = watch("../src/pages", { recursive: true });
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
	rmSync("./temp_css", { recursive: true, force: true });

	const process = exec("sass --watch ../src/styles:temp_css --no-source-map");
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

let tscInitialised = true;

const tscRecompiled = /^[^-]+- Found (\d+) errors\. Watching for file changes\.$/;

function startTscListener() {
	// setup promise for initialisation
	const { promise, resolve } = Promise.withResolvers();

	// remove any previously compiled files from the directory
	rmSync("./temp_js", { recursive: true, force: true });

	const process = exec("tsc --watch -p ../tsconfig.json --outDir ./temp_js");
	process.stdout.on("data", data => {
		if (typeof data !== "string") return;
		const stdout = data.trim();

		const tscMatch = tscRecompiled.exec(stdout);
		if (tscMatch !== null) {
			const numErrors = tscMatch[1];
			if (tscInitialised && numErrors === "0") {
				console.log("TSC initialised.");
				tscInitialised = false;
				resolve();
			} else console.log(`TSC re-generated with ${numErrors} errors.`);

			if (tscInitialised) sendReload();
		}
	});

	return promise;
}

function startAssetListener() {
	const watcher = watch("../assets", { recursive: true });
	watcher.addListener("change", () => sendReload());

	console.log("Assets initialised.");
	return Promise.resolve();
}
