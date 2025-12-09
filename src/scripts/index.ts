import { loadSearchBox } from "./map/search.js";
import { displayMessage } from "./messages.js";
import { WELCOME_POPUP } from "./popup/welcome.js";
import * as Settings from "./settings/index.js";
import { Effect, State } from "./state/index.js";

// display a message on the message popup when a JS error occurs
window.addEventListener("error", () => displayMessage("error"));

// setup and process permalink
const hash = window.location.hash;
const id = Number(hash.substring(1));
if (hash.length > 0 && !isNaN(id)) await loadSearchBox(id.toString());
new Effect(() => {
	const hash = State.currentRelationId.get()?.toString() ?? "";
	window.location.hash = hash;
});

// first time popup
if (Settings.get("firstLaunch")) {
	WELCOME_POPUP.display(() => Settings.set("firstLaunch", false));
}
