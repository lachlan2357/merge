import { getElement } from "./dom.js";
import { ElementBuilder } from "./elements.js";

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

export class Message {
	static readonly element: HTMLDivElement = getElement("messages");

	static display(key: AppMsg) {
		const message = appMsgMap[key];
		this.displayString(message);
	}

	static async displayString(msg: string) {
		const messageText = new ElementBuilder("p").text(msg).build();

		const message = new ElementBuilder("div")
			.class("message-box")
			.children(messageText)
			.attribute("visible", "")
			.build();

		Message.element.append(message);

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
}

/**
 * An error type that can directly send the contents of it's error to the {@link Message} box.
 */
export class MessageBoxError extends Error {
	display() {
		Message.displayString(this.message);
	}
}
