import * as messageBox from "./messages.js";
import { State } from "./state/index.js";

/** The base URL pointing to OpenStreetMap. */
const ID_BASE_URL = new URL("https://www.openstreetmap.org");

/**
 * Open a URL in a new browser tab.
 *
 * @param url The URL to open.
 */
function openUrl(url: URL) {
	window.open(url, "_blank", "noreferrer noopener");
}

/** The base URL pointing to the socket JOSM uses for remote control. */
const JOSM_BASE_URL = new URL("http://127.0.0.1:8111/load_and_zoom");

/**
 * Open a URL in JOSM.
 *
 * @param url The URL to open.
 */
function openJosm(url: URL) {
	const { minLat, maxLat, minLon, maxLon } = State.multiplier.get();
	url.searchParams.set("left", minLon.toString());
	url.searchParams.set("right", maxLon.toString());
	url.searchParams.set("top", maxLat.toString());
	url.searchParams.set("bottom", minLat.toString());

	fetch(url).catch(() =>
		messageBox.displayString(
			"Failed to load map in JOSM. Ensure it is running and remote control is enabled."
		)
	);
}
/** Methods to open a way. */
export const way = {
	/** Open the currently selected way in iD. */
	iD() {
		const wayId = State.selectedWay.get();
		if (wayId < 0) return;

		const url = new URL(ID_BASE_URL);
		url.pathname = `/way/${wayId}`;
		openUrl(url);
	},
	/** Open the currently selected way in JOSM. */
	josm() {
		const wayId = State.selectedWay.get();
		if (wayId < 0) return;

		const url = new URL(JOSM_BASE_URL);
		url.searchParams.set("select", `way${wayId}`);
		openJosm(url);
	}
};

/** Methods to open a relation. */
export const relation = {
	/** Open the currently loaded relation in OpenStreetMap. */
	iD() {
		const relationId = State.currentRelationId.get();
		if (relationId === undefined) return;

		const url = new URL(ID_BASE_URL);
		url.pathname = `/relation/${relationId}`;
		openUrl(url);
	},
	/** Open the currently loaded relation in JOSM. */
	josm() {
		const relationId = State.currentRelationId.get();
		if (relationId === undefined) return;

		const url = new URL(JOSM_BASE_URL);
		url.searchParams.set("select", `relation${relationId}`);
		openJosm(url);
	}
};
