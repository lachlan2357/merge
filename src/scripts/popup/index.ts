import { ElementBuilder, FontAwesomeIcon } from "../elements.js";
import { State } from "../state/index.js";
import { getElement } from "../supplement/elements.js";
import { OsmValue } from "../types/osm.js";

export const POPUP = getElement("popup", HTMLDialogElement);
export const WAY_INFO = getElement("way-info", HTMLDivElement);
export const WAY_INFO_ID = getElement("wayid", HTMLHeadingElement);
export const WAY_INFO_TAGS = getElement("tags", HTMLTableElement);

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
		while (POPUP.lastChild !== null) POPUP.lastChild.remove();

		// add window popup decorations
		const heading = new ElementBuilder("h3").text(this.title).build();
		const closeIcon = new FontAwesomeIcon("solid", "xmark").build();
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
		POPUP.append(header, main);
		POPUP.showModal();
	}

	static close() {
		if (!POPUP.open) return;
		POPUP.close();
	}
}

export function displaySidebar(wayId: number) {
	// get data for way
	const wayData = State.data.get()?.get(wayId);
	if (wayData === undefined) return;

	// update url
	WAY_INFO_ID.innerHTML = `Way <a href="https://www.openstreetmap.org/way/${wayId}" target="_blank">${wayId}</a>`;

	// purge all tag entries from any previous ways
	while (WAY_INFO_TAGS.lastChild) WAY_INFO_TAGS.removeChild(WAY_INFO_TAGS.lastChild);

	// create heading row
	const tagHeading = new ElementBuilder("th").text("Tag").build();
	const valueHeading = new ElementBuilder("th").text("Value").build();
	const row = new ElementBuilder("tr").children(tagHeading, valueHeading).build();
	WAY_INFO_TAGS.append(row);

	// compile all original tags
	const originalTags = wayData.originalWay.tags ?? {};
	const originalTagMap = new Map<string, string>();
	Object.entries(originalTags).forEach(([tag, value]) => originalTagMap.set(tag, value));

	// compile all inferred tags
	const inferredTags = wayData.tags;
	const inferredTagMap = new Map<string, string>();
	Object.entries(inferredTags).forEach(([tag, value]) => {
		// format tag
		const words = Array.from(tag);
		let formattedTag = "";
		for (let i = 0; i < words.length; i++) {
			const letter = words[i];
			if (letter.toUpperCase() !== letter) formattedTag += letter;
			else formattedTag += `:${letter.toLowerCase()}`;
		}

		// format value
		let valueString = "<unknown>";
		if (value instanceof OsmValue) valueString = value.toString();

		inferredTagMap.set(formattedTag, valueString);
	});

	// get all tags from both maps
	const allTagsRaw = originalTagMap
		.keys()
		.toArray()
		.concat(inferredTagMap.keys().toArray())
		.sort();
	const allTags = new Set(allTagsRaw);

	// create each content row
	for (const tag of allTags) {
		const originalValue = originalTagMap.get(tag);
		const inferredValue = inferredTagMap.get(tag);

		// generate display string
		let displayString = originalValue;
		if (displayString === undefined && inferredValue !== undefined) {
			if (inferredValue === "") displayString = "<no value>";
			else displayString = `${inferredValue} (inferred)`;
		}
		displayString ??= "<unknown>";

		// build row
		const tagCell = new ElementBuilder("td").text(tag.toString()).build();
		const valueCell = new ElementBuilder("td").text(displayString).build();
		const tagRow = new ElementBuilder("tr").children(tagCell, valueCell).build();

		WAY_INFO_TAGS.append(tagRow);
	}

	WAY_INFO.removeAttribute("hidden");
	State.selectedWay.set(wayId);
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
