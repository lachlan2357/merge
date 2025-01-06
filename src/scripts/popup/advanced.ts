import { ElementBuilder } from "../elements.js";
import { Popup } from "./index.js";

export class AdvancedPopup extends Popup {
	build(): Array<HTMLElement> {
		const heading = new ElementBuilder("h2").text("Advanced").build();
		const advanced = new ElementBuilder("p").text("Coming soon. Stay Tuned.").build();
		return [heading, advanced];
	}
}

export const ADVANCED_POPUP = new AdvancedPopup();
