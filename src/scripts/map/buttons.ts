import { ABOUT_POPUP } from "../popup/about.js";
import { ADVANCED_POPUP } from "../popup/advanced.js";
import { HELP_POPUP } from "../popup/help.js";
import { SETTINGS_POPUP } from "../popup/settings.js";
import { SHARE_POPUP } from "../popup/share.js";
import { WARNINGS_POPUP } from "../popup/warnings.js";
import { getElement } from "../supplement/elements.js";
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
	ADVANCED_POPUP.display()
);
export const SETTINGS_BUTTON = new MapButton("settings").setAction("click", () =>
	SETTINGS_POPUP.display()
);
export const SHARE_BUTTON = new MapButton("share").setAction("click", () => SHARE_POPUP.display());
export const HELP_BUTTON = new MapButton("help").setAction("click", () => HELP_POPUP.display());
export const ABOUT_BUTTON = new MapButton("about").setAction("click", () => ABOUT_POPUP.display());

// warnings
export const WARNINGS_BUTTON = new MapButton("warnings").setAction("click", () =>
	WARNINGS_POPUP.display()
);
