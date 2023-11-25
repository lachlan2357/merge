import { setAndSearch, togglePopup } from "./dom.js";
import { Settings } from "./settings.js";

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
