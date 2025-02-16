import { ElementBuilder } from "../elements.js";
import { Popup } from "./index.js";

/** Popup definition for the help screen. */
class HelpPopup extends Popup {
	protected readonly title = "Help";

	build(): Array<HTMLElement> {
		const help = new ElementBuilder("p").text("Coming soon. Stay Tuned.").build();
		return [help];
	}
}

export const HELP_POPUP = new HelpPopup();
