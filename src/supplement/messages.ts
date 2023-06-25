import { addMessage } from "./dom.js";
import { ElementBuilder } from "./elements.js";

export const AppMsgMap = {
	emptyShare: "Map is empty. Nothing to share.",
	overpassDownload: "Downloading from Overpass...",
	noSearchTerm: "Please enter a search term.",
	malformedSearchTerm: "Currently, double quotes are not supported.",
	multipleRelations: "Multiple relations share that name. Use relation id.",
	noResult: "No Results."
} as const;

export type AppMsg = keyof typeof AppMsgMap;

export function getMsg(key: AppMsg) {
	return AppMsgMap[key];
}

export async function displayMessage(key: AppMsg) {
	const messageText = new ElementBuilder("p").text(getMsg(key)).build();
	const message = new ElementBuilder("div")
		.class("message-box")
		.children(messageText)
		.attribute("visible", "")
		.build();

	addMessage(message);
}
