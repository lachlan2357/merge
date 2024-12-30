import { setAndSearch, togglePopup } from "./dom.js";
import { Message } from "./messages.js";
import { Settings } from "./settings.js";

// display a message on the message popup when a JS error occurs
window.addEventListener("error", () => Message.display("error"));

// permalinks
const hash = window.location.hash;
const id = Number(hash.substring(1));
if (hash.length > 0 && !isNaN(id)) setAndSearch(id.toString());
else setAndSearch();

// first time popup
if (Settings.get("firstLaunch")) {
	togglePopup("welcome");
	Settings.set("firstLaunch", false);
}