import { getElement } from "../dom/elements.js";
import { togglePopup } from "../dom/popup.js";
import { CANVAS } from "./canvas.js";

class MapButton {
	private readonly element: HTMLButtonElement;

	constructor(id: string) {
		this.element = getElement(id, HTMLButtonElement);
	}

	setAction(event: keyof HTMLElementEventMap, action: () => void) {
		this.element.addEventListener(event, action);
		return this;
	}
}

// map controls
export const ZOOM_IN_BUTTON = new MapButton("zoom-in").setAction("click", () =>
	CANVAS.zoom("in", "button")
);
export const ZOOM_OUT_BUTTON = new MapButton("zoom-out").setAction("click", () =>
	CANVAS.zoom("out", "button")
);
export const ZOOM_RESET_BUTTON = new MapButton("zoom-reset").setAction("click", () =>
	CANVAS.centre()
);
export const FULLSCREEN_BUTTON = new MapButton("fullscreen").setAction("click", () =>
	CANVAS.toggleFullscreen()
);

// popup toggles
export const ADVANCED_BUTTON = new MapButton("advanced").setAction("click", () =>
	togglePopup("advanced")
);
export const SETTINGS_BUTTON = new MapButton("settings").setAction("click", () =>
	togglePopup("settings")
);
export const SHARE_BUTTON = new MapButton("share").setAction("click", () => togglePopup("share"));
export const HELP_BUTTON = new MapButton("help").setAction("click", () => togglePopup("help"));
export const ABOUT_BUTTON = new MapButton("about").setAction("click", () => togglePopup("about"));
