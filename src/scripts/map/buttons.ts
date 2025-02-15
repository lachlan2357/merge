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
new MapButton("zoom-in").setAction("click", () =>
	CANVAS.zoom("in", "button")
);
new MapButton("zoom-out").setAction("click", () =>
	CANVAS.zoom("out", "button")
);
new MapButton("zoom-reset").setAction("click", () =>
	CANVAS.centre()
);
new MapButton("fullscreen").setAction("click", () =>
	CANVAS.toggleFullscreen()
);

// popup toggles
new MapButton("advanced").setAction("click", () =>
	ADVANCED_POPUP.display()
);
new MapButton("settings").setAction("click", () =>
	SETTINGS_POPUP.display()
);
new MapButton("share").setAction("click", () => SHARE_POPUP.display());
new MapButton("help").setAction("click", () => HELP_POPUP.display());
new MapButton("about").setAction("click", () => ABOUT_POPUP.display());

// warnings
new MapButton("warnings").setAction("click", () =>
	WARNINGS_POPUP.display()
);
