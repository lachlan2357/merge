import { FontAwesomeIcon } from "../components/icon.js";
import { MessageBoxError } from "../messages.js";
import { overpassSearch } from "../overpass/index.js";
import { getElement } from "../supplement/elements.js";
const SEARCH_FORM = getElement("search-form", HTMLFormElement);
const SEARCH_BOX = getElement("relation-name", HTMLInputElement);
const SEARCH_ICON = getElement("search-icon", FontAwesomeIcon);
export async function loadSearchBox(searchTerm) {
    SEARCH_BOX.value = searchTerm;
    await search(searchTerm);
}
function setSearching(searching) {
    // set icon
    const icon = searching ? "circle-notch" : "magnifying-glass";
    SEARCH_ICON.setIcon(icon);
    // set/clear animation
    const animation = searching ? "spin" : null;
    SEARCH_ICON.setAnimation(animation);
}
SEARCH_FORM.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        // get form data
        const form = e.target;
        if (!(form instanceof HTMLFormElement))
            throw SearchError.NO_FORM;
        const formData = new FormData(form);
        // retrieve search term
        const searchTerm = formData.get("relation")?.toString();
        if (searchTerm === undefined)
            throw SearchError.EMPTY_SEARCH_TERM;
        // search
        await search(searchTerm);
    }
    catch (error) {
        if (error instanceof MessageBoxError)
            error.display();
        else
            console.error(error);
    }
});
async function search(searchTerm) {
    // set searching state
    setSearching(true);
    try {
        await overpassSearch(searchTerm);
    }
    catch (error) {
        if (error instanceof MessageBoxError)
            error.display();
        else
            console.error(error);
    }
    finally {
        // clear searching state
        setSearching(false);
    }
}
class SearchError extends MessageBoxError {
    static NO_FORM = new SearchError("Could not retrieve form data from search form.");
    static EMPTY_SEARCH_TERM = new SearchError("Search box empty when performing search.");
}
