import { FontAwesomeIcon } from "../components/icon.js";
import { ElementBuilder } from "../elements.js";
import external from "../external.js";
import { State } from "../state/index.js";
import { createCustomElement, getElement } from "../supplement/elements.js";
import { OsmValue } from "../types/osm.js";

const SIDEBAR = getElement("way-info", HTMLDivElement);
const WAY_EXTERNAL_LINK = getElement("wayid-link", HTMLAnchorElement);

const DRAWN_TAGS = getElement("drawn-tags", HTMLTableSectionElement);
const OTHER_TAGS = getElement("other-tags", HTMLTableSectionElement);

const EDIT_ID = getElement("edit-id", HTMLButtonElement);
EDIT_ID.addEventListener("click", () => external.way.iD());

const EDIT_JOSM = getElement("edit-josm", HTMLButtonElement);
EDIT_JOSM.addEventListener("click", () => external.way.josm());

const CLOSE_BUTTON = getElement("sidebar-close", HTMLButtonElement);
CLOSE_BUTTON.addEventListener("click", () => hide());

/**
 * All tags used when drawing the map.
 *
 * In future, there should be a way to generate this automatically as updating this variable every
 * time the drawing function evolves isn't reasonable.
 */
const usedTags: Array<string> = [
	"oneway",
	"lanes:forward",
	"lanes:backward",
	"surface",
	"turn:lanes:forward",
	"turn:lanes:backward"
];

/**
 * Open the sidebar, populating it's content with that of a specific way.
 *
 * @param wayId The ID of the way to populate the content for.
 */
function show(wayId: number) {
	// get data for way
	const wayData = State.data.get()?.get(wayId);
	if (wayData === undefined) return;

	// update heading url and text
	WAY_EXTERNAL_LINK.href = `https://www.openstreetmap.org/way/${wayId}`;
	WAY_EXTERNAL_LINK.textContent = wayId.toString();

	// purge all tag entries from any previous ways
	while (DRAWN_TAGS.lastChild) DRAWN_TAGS.removeChild(DRAWN_TAGS.lastChild);
	while (OTHER_TAGS.lastChild) OTHER_TAGS.removeChild(OTHER_TAGS.lastChild);

	// compile all original tags
	const originalTags = wayData.originalWay.tags ?? {};
	const originalTagMap = new Map<string, string>();
	Object.entries(originalTags).forEach(([tag, value]) => originalTagMap.set(tag, value));

	// compile all inferred tags
	const inferredTags = wayData.tags;
	const inferredTagMap = new Map<string, string>();
	Object.entries(inferredTags).forEach(([tag, value]) => {
		// format tag
		let formattedTag = "";
		const letters = Array.from(tag);
		for (const letter of letters) {
			if (letter.toUpperCase() !== letter) formattedTag += letter;
			else formattedTag += `:${letter.toLowerCase()}`;
		}

		// format value
		let valueString = "<unknown>";
		if (value instanceof OsmValue) valueString = value.toString();

		inferredTagMap.set(formattedTag, valueString);
	});

	// get all tags from both sets
	const allOriginalTags = Array.from(originalTagMap.keys());
	const allInferredTags = Array.from(inferredTagMap.keys());
	const allTags = new Set([...allOriginalTags, ...allInferredTags].sort());

	// create each content row
	for (const tag of allTags) {
		const originalValue = originalTagMap.get(tag);
		const inferredValueRaw = inferredTagMap.get(tag);

		// inferred values strings store no-value as empty string, convert it back
		const inferredValue = inferredValueRaw === "" ? undefined : inferredValueRaw;

		// create children
		const valueString = inferredValue ?? originalValue ?? "<no value>";

		// build row
		const tagCell = new ElementBuilder("td").class("code").text(tag.toString()).build();
		const valueCell = new ElementBuilder("td").class("code").text(valueString);
		if (originalValue === undefined && inferredValueRaw !== undefined) {
			const icon = createCustomElement(FontAwesomeIcon).setIcon("circle-info");
			const iconSpan = new ElementBuilder("span")
				.class("inference-icon")
				.tooltip("This value has been inferred", "left")
				.children(icon)
				.build();
			valueCell.children(iconSpan);
		}
		const tagRow = new ElementBuilder("tr").children(tagCell, valueCell.build()).build();

		// append row to table depending on whether it's used in the drawing process
		if (usedTags.includes(tag)) DRAWN_TAGS.append(tagRow);
		else OTHER_TAGS.append(tagRow);
	}

	// show sidebar
	SIDEBAR.removeAttribute("hidden");
	State.selectedWay.set(wayId);
	SIDEBAR.scrollTop = 0;
}

/**
 * Close the sidebar.
 */
function hide() {
	SIDEBAR.setAttribute("hidden", "true");
}

export default { show, hide };
