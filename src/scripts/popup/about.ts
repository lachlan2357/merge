import { ElementBuilder, FontAwesomeIcon, LinkChip } from "../elements.js";
import { Popup } from "./index.js";

export class AboutPopup extends Popup {
	build(): Array<HTMLElement> {
		const heading = new ElementBuilder("h2").text("About").build();

		const description = new ElementBuilder("p")
			.text(
				"Welcome to Merge! This project is still in it's early stages so bugs are missing features are to be expected. If you find any issues that aren't already known, please submit a report to the Github page."
			)
			.build();
		const chip = new LinkChip()
			.url("https://www.github.com/lachlan2357/merge")
			.text("GitHub")
			.icon(new FontAwesomeIcon("brands", "github"))
			.build();

		return [heading, description, chip];
	}
}

export const ABOUT_POPUP = new AboutPopup();
