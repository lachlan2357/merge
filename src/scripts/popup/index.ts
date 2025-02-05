import { FontAwesomeIcon } from "../components/icon.js";
import { ElementBuilder } from "../elements.js";
import { State } from "../state/index.js";
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
			.class("button")
			.children(closeIcon)
			.event("click", () => Popup.close())
			.build();
		const header = new ElementBuilder("header").children(heading, closeButton).build();

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

export function openID() {
	window.open(
		`https://www.openstreetmap.org/relation/${State.currentRelationId.get()}`,
		"_blank",
		"noreferrer noopener"
	);
}

export function editID() {
	window.open(
		`https://www.openstreetmap.org/edit?way=${State.selectedWay.get()}`,
		"_blank",
		"noreferrer noopener"
	);
}

export function openJOSM() {
	const { minLat, maxLat, minLon, maxLon } = State.multiplier.get();
	const url = `127.0.0.1:8111/load_and_zoom?left=${minLon}&right=${maxLon}&top=${maxLat}&bottom=${minLat}&select=relation${State.currentRelationId.get()}`;
	fetch(url);
}
