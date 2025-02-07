import { ElementBuilder } from "../elements.js";
import { Popup } from "./index.js";

export class WelcomePopup extends Popup {
	protected readonly title = "Welcome to Merge";

	build(): Array<HTMLElement> {
		const img = new ElementBuilder("img").id("welcome-img").src("/merge/icon.png").build();
		const description = new ElementBuilder("p")
			.text(
				"Welcome to Merge! To get started, use the search box to lookup a relation by either RelationID or name. Note: once each request has successfully returned information, the data is cached and when requested again, it pulls from the cache. To re-request data, toggle the options in settings."
			)
			.build();

		return [img, description];
	}
}

export const WELCOME_POPUP = new WelcomePopup();
