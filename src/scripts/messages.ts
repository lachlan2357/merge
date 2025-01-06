import { ElementBuilder } from "./elements.js";
import { getElement } from "./supplement/elements.js";

const appMsgMap = {
	emptyShare: "Map is empty. Nothing to share.",
	overpassDownload: "Downloading from Overpass...",
	noSearchTerm: "Please enter a search term.",
	malformedSearchTerm: "Currently, double quotes are not supported.",
	multipleRelations: "Multiple relations share that name. Use relation id.",
	noResult: "No Results.",
	overpassError: "Error retrieving data from Overpass.",
	error: "Something went wrong."
} as const;

export type AppMsg = keyof typeof appMsgMap;

const element = getElement("messages", HTMLDivElement);

export function displayMessage(key: AppMsg) {
	const message = appMsgMap[key];
	displayMessageString(message);
}

export async function displayMessageString(msg: string) {
	const messageText = new ElementBuilder("p").text(msg).build();

	const message = new ElementBuilder("div")
		.class("message-box")
		.children(messageText)
		.attribute("visible", "")
		.build();

	element.append(message);

	await new Promise(resolve => setTimeout(resolve, 5000));

	message.setAttribute("closing", "");
	message.addEventListener(
		"animationend",
		() => {
			message.removeAttribute("closing");
			message.removeAttribute("visible");
			message.parentElement?.removeChild(message);
		},
		{ once: true }
	);
}

export const MESSAGE_BOX = {
	display: displayMessage,
	displayString: displayMessageString
};

/**
 * An error type that can directly send the contents of it's error to the {@link Message} box.
 */
export class MessageBoxError extends Error {
	display() {
		displayMessageString(this.message);
	}
}
