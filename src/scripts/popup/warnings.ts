import { FontAwesomeIcon } from "../components/icon.js";
import { ElementBuilder } from "../elements.js";
import { State } from "../state/index.js";
import { createCustomElement } from "../supplement/elements.js";
import { Popup, displaySidebar } from "./index.js";

export class WarningsPopup extends Popup {
	protected readonly title = "Warnings";

	build(): Array<HTMLElement> {
		const emptyText = new ElementBuilder("p")
			.text("There are no warnings for the data on the map.")
			.build();

		// ensure data exists
		const dataCache = State.data.get();
		if (dataCache === undefined) {
			return [emptyText];
		}

		// display all warnings
		const entries = new Array<HTMLElement>();
		for (const way of dataCache.values()) {
			const id = way.originalWay.id;
			const subHeading = new ElementBuilder("h3").text(`Way ${id.toString()}`).build();
			const icon = createCustomElement(FontAwesomeIcon).setIcon("arrow-up-right-from-square");
			const subHeadingLink = new ElementBuilder("button")
				.event("click", () => displaySidebar(id))
				.children(icon)
				.build();
			const list = new ElementBuilder("ul");

			for (const [tag, warnings] of way.warnings) {
				for (const warning of warnings) {
					const listItem = new ElementBuilder("li")
						.text(`${tag}: ${warning.message}`)
						.build();
					list.children(listItem);
				}
			}

			const listElement = list.build();

			if (listElement.children.length > 0) {
				const header = new ElementBuilder("header")
					.children(subHeading, subHeadingLink)
					.build();

				const container = new ElementBuilder("div")
					.class("container", "vertical")
					.children(header, listElement)
					.build();

				entries.push(container);
			}
		}

		// display warnings if present
		if (entries.length === 0) return [emptyText];
		else return entries;
	}
}

export const WARNINGS_POPUP = new WarningsPopup();
