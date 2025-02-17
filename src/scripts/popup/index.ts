import { FontAwesomeIcon } from "../components/icon.js";
import { ElementBuilder } from "../elements.js";
import { createCustomElement, getElement } from "../supplement/elements.js";

/** The {@link HTMLDialogElement} to render the popup in. */
export const POPUP_DIALOG = getElement("popup", HTMLDialogElement);

/** Define a popup window to be displayed. */
export abstract class Popup {
	/** The title of the popup, to be displayed at the top of the window. */
	protected abstract title: string;

	/**
	 * All children of the popup.
	 *
	 * This is generally calculated through {@link build()} at a later stage.
	 */
	private children = new Array<HTMLElement>();

	/**
	 * Construct the {@link HTMLElement HTMLElements} to be appended to the popup window.
	 *
	 * @returns All children to be appended to the popup.
	 */
	abstract build(): Array<HTMLElement>;

	/** Display this popup window in the {@link POPUP_DIALOG}. */
	display() {
		// purge all existing children
		while (POPUP_DIALOG.lastChild !== null) POPUP_DIALOG.lastChild.remove();

		// add window popup decorations
		const heading = new ElementBuilder("h2").text(this.title).build();
		const closeIcon = createCustomElement(FontAwesomeIcon).setIcon("xmark");
		const closeButton = new ElementBuilder("button")
			.id("popup-close")
			.addClasses("close-button")
			.children(closeIcon)
			.event("click", () => Popup.close())
			.tooltip("Close", "bottom")
			.build();
		const icons = new ElementBuilder("div")
			.addClasses("title-bar-buttons")
			.children(closeButton)
			.build();
		const header = new ElementBuilder("header")
			.addClasses("title-bar")
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

	/** Close the popup dialog. */
	static close() {
		if (POPUP_DIALOG.open) POPUP_DIALOG.close();
	}
}
