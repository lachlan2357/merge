import { ElementBuilder, FontAwesomeIcon } from "../elements.js";
import * as Settings from "../settings/index.js";
import { Popup } from "./index.js";

export class SettingsPopup extends Popup {
	protected readonly title = "Settings";

	build(): Array<HTMLElement> {
		const elements = new Array<HTMLElement>();

		for (const key of Settings.keys()) {
			// ensure setting should be displayed in the menu
			const setting = Settings.getObject(key);
			if (!setting.inSettingsMenu) continue;

			// setting info
			const heading = new ElementBuilder("h3").text(setting.name).build();
			const text = new ElementBuilder("p")
				.class("setting-title")
				.text(setting.description)
				.build();

			// fetch the input box
			const inputElement = setting.inputElement.build();

			// create reset button
			const resetIcon = new FontAwesomeIcon("solid", "arrow-rotate-right").build();
			const resetButton = new ElementBuilder("button")
				.class("reset-button")
				.event("click", () => setting.reset())
				.children(resetIcon)
				.build();

			// append children
			const innerDiv = new ElementBuilder("div")
				.class("setting-text")
				.children(heading, text)
				.build();
			const outerDiv = new ElementBuilder("div")
				.class("container")
				.children(innerDiv, inputElement, resetButton)
				.build();
			elements.push(outerDiv);
		}

		return elements;
	}
}

export const SETTINGS_POPUP = new SettingsPopup();
