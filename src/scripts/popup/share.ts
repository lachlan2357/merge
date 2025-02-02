import { FontAwesomeIcon } from "../components/icon.js";
import { ElementBuilder } from "../elements.js";
import { State } from "../state/index.js";
import { createCustomElement } from "../supplement/elements.js";
import { Popup, openID, openJOSM } from "./index.js";

export class SharePopup extends Popup {
	protected readonly title = "Share";

	build(): Array<HTMLElement> {
		const shareText = `${window.location.origin}${
			window.location.pathname
		}#${State.currentRelationId.get()}`;

		const copyIcon = createCustomElement(FontAwesomeIcon).setIcon("copy");
		const copyButton = new ElementBuilder("button")
			.id("copy-button")
			.class("copy")
			.children(copyIcon)
			.build();

		const share = new ElementBuilder("span").class("share").text(shareText).build();

		const container = new ElementBuilder("div")
			.id("copy-container")
			.children(share, copyButton)
			.build();

		const iDIcon = createCustomElement(FontAwesomeIcon).setIcon("map");
		const iDButton = new ElementBuilder("button")
			.id("osm")
			.class("open-with")
			.tooltip("Open in iD")
			.event("click", openID)
			.children(iDIcon)
			.build();

		const josmIcon = createCustomElement(FontAwesomeIcon).setIcon("desktop");
		const josmButton = new ElementBuilder("button")
			.id("josm")
			.class("open-with")
			.tooltip("Open in JOSM")
			.event("click", openJOSM)
			.children(josmIcon)
			.build();

		const openWithContainer = new ElementBuilder("div")
			.id("open-with-container")
			.children(iDButton, josmButton)
			.build();

		copyButton.addEventListener("click", () => {
			navigator.clipboard.writeText(shareText).then(() => {
				copyIcon.classList.remove("fa-copy");
				copyIcon.classList.add("fa-check");
			});
		});

		iDButton.addEventListener("click", () => openID);
		josmIcon.addEventListener("click", openJOSM);

		return [container, openWithContainer];
	}
}

export const SHARE_POPUP = new SharePopup();
