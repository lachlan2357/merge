import { ElementBuilder } from "../elements.js";
import { Popup } from "./index.js";

/** Popup definition for the advanced screen. */
class AdvancedPopup extends Popup {
	protected readonly title = "Advanced";

	build(): Array<HTMLElement> {
		const advanced = new ElementBuilder("p").text("Coming soon. Stay Tuned.").build();
		return [advanced];
	}
}

export const ADVANCED_POPUP = new AdvancedPopup();
