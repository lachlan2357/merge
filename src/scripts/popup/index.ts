import { FontAwesomeIcon } from "../components/icon.js";
import { ElementBuilder } from "../elements.js";
import { createCustomElement, getElement } from "../supplement/elements.js";

export const POPUP_DIALOG = getElement("popup", HTMLDialogElement);

export abstract class Popup {
	protected abstract title: string;

	private children: Array<HTMLElement> = new Array();

	/**
	 * Construct the {@link HTMLElement HTMLElements} to be appended to the popup window.
	 *
	 * @returns All children to be appended to the popup.
	 */
	abstract build(): Array<HTMLElement>;

	display() {
		// purge all existing children
		while (POPUP_DIALOG.lastChild !== null) POPUP_DIALOG.lastChild.remove();

		// add window popup decorations
		const heading = new ElementBuilder("h2").text(this.title).build();
		const closeIcon = createCustomElement(FontAwesomeIcon).setIcon("xmark");
		const closeButton = new ElementBuilder("button")
			.id("popup-close")
			.class("close-button")
			.children(closeIcon)
			.event("click", () => Popup.close())
			.tooltip("Close", "bottom")
			.build();
		const icons = new ElementBuilder("div")
			.class("title-bar-buttons")
			.children(closeButton)
			.build();
		const header = new ElementBuilder("header")
			.class("title-bar")
			.children(heading, icons)
			.build();

		// rebuild and append children
		this.children = this.build();
		const main = new ElementBuilder("main").children(...this.children).build();

		// show popup
		POPUP_DIALOG.append(header, main);
		POPUP_DIALOG.showModal();
		POPUP_DIALOG.scrollTop = 0;
	}

	static close() {
		if (!POPUP_DIALOG.open) return;
		POPUP_DIALOG.close();
	}
}
