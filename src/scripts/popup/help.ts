import { ElementBuilder } from "../elements.js";
import { Popup } from "./index.js";

export class HelpPopup extends Popup {
	build(): Array<HTMLElement> {
		const heading = new ElementBuilder("h2").text("Help").build();
		const help = new ElementBuilder("p").text("Coming soon. Stay Tuned.").build();
		return [heading, help];
	}
}

export const HELP_POPUP = new HelpPopup();
