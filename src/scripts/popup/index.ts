import { ElementBuilder, FontAwesomeIcon } from "../elements.js";
import { State } from "../state.js";
import { getElement } from "../supplement/elements.js";
import { OverpassWay } from "../types/overpass.js";

export const POPUP = getElement("popup", HTMLDialogElement);
export const WAY_INFO = getElement("way-info", HTMLDivElement);
export const WAY_INFO_ID = getElement("wayid", HTMLHeadingElement);
export const WAY_INFO_TAGS = getElement("tags", HTMLTableElement);

export abstract class Popup {
	private children: Array<HTMLElement> = new Array();

	/**
	 * Construct the {@link HTMLElement HTMLElements} to be appended to the popup window.
	 *
	 * @returns All children to be appended to the popup.
	 */
	abstract build(): Array<HTMLElement>;

	display() {
		// purge all existing children
		while (POPUP.lastChild !== null) POPUP.lastChild.remove();

		// rebuild and append children
		this.children = this.build();
		POPUP.append(...this.children);

		// add window popup decorations
		const closeIcon = new FontAwesomeIcon("solid", "xmark").build();
		const closeButton = new ElementBuilder("button")
			.id("popup-close")
			.class("button")
			.children(closeIcon)
			.event("click", () => Popup.close())
			.build();

		POPUP.append(closeButton);

		// show popup
		POPUP.showModal();
	}

	static close() {
		if (!POPUP.open) return;

		// close popup
		POPUP.setAttribute("closing", "");
		POPUP.addEventListener(
			"animationend",
			() => {
				POPUP.removeAttribute("closing");
				POPUP.close();
			},
			{ once: true }
		);
	}
}

export function displayPopup(element: { wayId: number; path: Path2D }, way: OverpassWay) {
	WAY_INFO_ID.innerHTML = `Way <a href="https://www.openstreetmap.org/way/${element.wayId}" target="_blank">${element.wayId}</a>`;

	// purge all children before adding new ones
	while (WAY_INFO_TAGS.lastChild) WAY_INFO_TAGS.removeChild(WAY_INFO_TAGS.lastChild);

	// create heading row
	const tagHeading = new ElementBuilder("th").text("Tag").build();
	const valueHeading = new ElementBuilder("th").text("Value").build();

	const row = new ElementBuilder("tr").children(tagHeading, valueHeading).build();

	WAY_INFO_TAGS.append(row);

	// content rows
	Object.entries(way.tags ?? {}).forEach(([tag, value]) => {
		const tagCell = new ElementBuilder("td").text(tag.toString()).build();
		const valueCell = new ElementBuilder("td").text(value.toString()).build();
		const tagRow = new ElementBuilder("tr").children(tagCell, valueCell).build();

		WAY_INFO_TAGS.append(tagRow);
	});

	WAY_INFO.removeAttribute("hidden");
	State.selectedWay.set(way.id);
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
