import { MessageBoxError } from "../messages.js";
import { Overpass } from "../overpass.js";
import { getElement } from "../supplement/elements.js";

const SEARCH_FORM = getElement("search-form", HTMLFormElement);
const SEARCH_BOX = getElement("relation-name", HTMLInputElement);
const SEARCH_BUTTON = getElement("search", HTMLButtonElement);
const SEARCH_ICON = getElement("search-icon", HTMLElement);

export async function loadSearchBox(searchTerm: string) {
	SEARCH_BOX.value = searchTerm;
	await search(searchTerm);
}

function setSearching(searching: boolean) {
	// icon definitions
	const static_icons = ["fa-magnifying-glass"];
	const searching_icons = ["fa-circle-notch", "fa-spin"];

	// remove all icons
	SEARCH_ICON.classList.remove(...static_icons, ...searching_icons);

	// set icon depending on state
	SEARCH_ICON.classList.add(...(searching ? searching_icons : static_icons));
}

SEARCH_FORM.addEventListener("submit", async e => {
	e.preventDefault();

	try {
		// get form data
		const form = e.target;
		if (!(form instanceof HTMLFormElement)) throw SearchError.NO_FORM;
		const formData = new FormData(form);

		// retrieve search term
		const searchTerm = formData.get("relation")?.toString();
		if (searchTerm === undefined) throw SearchError.EMPTY_SEARCH_TERM;

		// search
		await search(searchTerm);
	} catch (error) {
		if (error instanceof MessageBoxError) error.display();
		else console.error(error);
	}
});

async function search(searchTerm: string) {
	// set searching state
	setSearching(true);

	try {
		await Overpass.search(searchTerm);
	} catch (error) {
		if (error instanceof MessageBoxError) error.display();
		else console.error(error);
	} finally {
		// clear searching state
		setSearching(false);
	}
}

class SearchError extends MessageBoxError {
	static readonly NO_FORM = new SearchError("Could not retrieve form data from search form.");
	static readonly EMPTY_SEARCH_TERM = new SearchError("Search box empty when performing search.");
}
