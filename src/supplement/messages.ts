import { messages } from "../script.js";

export const AppMsgMap = {
	emptyShare: "Map is empty. Nothing to share.",
	overpassDownload: "Downloading from Overpass...",
	noSearchTerm: "Please enter a search term.",
	malformedSearchTerm: "Currently, double quotes are not supported.",
	multipleRelations: "Multiple relations share that name. Use relation id.",
	noResult: "No Results.",
} as const;

export type AppMsg = keyof typeof AppMsgMap;

export function getMsg(key: AppMsg) {
	return AppMsgMap[key];
}

export async function displayMessage(key: AppMsg) {
	document.createElement("div", { is: "canvas-message" });

	const newDiv = document.createElement("div");
	newDiv.classList.add("message-box");

	const newParagraph = document.createElement("p");
	newParagraph.textContent = getMsg(key);
	newDiv.appendChild(newParagraph);

	messages.appendChild(newDiv);

	newDiv.setAttribute("visible", "");
	await new Promise(r => setTimeout(r, 5000));
	newDiv.setAttribute("closing", "");
	newDiv.addEventListener(
		"animationend",
		() => {
			newDiv.removeAttribute("closing");
			newDiv.removeAttribute("visible");
			messages.removeChild(newDiv);
		},
		{ once: true }
	);
}
