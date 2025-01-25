import { ElementBuilder } from "../elements.js";
import * as Settings from "../settings/index.js";
import { Popup } from "./index.js";

export class SettingsPopup extends Popup {
	build(): Array<HTMLElement> {
		const heading = new ElementBuilder("h2").text("Settings").build();
		const list = new ElementBuilder("div").id("settings-list").build();

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
			const resetButton = new ElementBuilder("button")
				.class("reset-button")
				.text("Reset")
				.event("click", () => setting.reset())
				.build();

			// append children
			const innerDiv = new ElementBuilder("div")
				.class("setting-text")
				.children(heading, text)
				.build();
			const outerDiv = new ElementBuilder("div")
				.class("setting-container")
				.children(innerDiv, inputElement, resetButton)
				.build();
			list.append(outerDiv);
		}

		return [heading, list];
	}
}

export const SETTINGS_POPUP = new SettingsPopup();
