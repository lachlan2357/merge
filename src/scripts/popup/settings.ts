import { FontAwesomeIcon } from "../components/icon.js";
import { PopupContainer } from "../components/popup.js";
import { ElementBuilder } from "../elements.js";
import * as Settings from "../settings/index.js";
import { createCustomElement } from "../supplement/elements.js";
import { Popup } from "./index.js";

/** Popup definition for the settings screen. */
class SettingsPopup extends Popup {
	protected readonly title = "Settings";

	build(): Array<HTMLElement> {
		const elements = new Array<PopupContainer>();

		for (const key of Settings.keys()) {
			// ensure setting should be displayed in the menu
			const setting = Settings.getObject(key);
			if (!setting.inSettingsMenu) continue;

			// header
			const heading = new ElementBuilder("h3").text(setting.name).build();
			const resetIcon = createCustomElement(FontAwesomeIcon).setIcon("arrow-rotate-right");
			const resetButton = new ElementBuilder("button")
				.addClasses("reset-button")
				.event("click", () => setting.reset())
				.tooltip("Reset", "bottom")
				.children(resetIcon)
				.build();

			// main
			const description = new ElementBuilder("p")
				.addClasses("setting-title")
				.text(setting.description)
				.build();
			const inputElement = setting.inputElement.build();

			// append children
			const container = createCustomElement(PopupContainer)
				.appendToHeader(heading, resetButton)
				.appendToMain(description, inputElement);
			elements.push(container);
		}

		return elements;
	}
}

/** Instance of {@link SettingsPopup}. */
export const SETTINGS_POPUP = new SettingsPopup();
