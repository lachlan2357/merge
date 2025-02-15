import { ElementBuilder } from "../elements.js";
import { CustomHTMLElement } from "./index.js";

/**
 * Custom container for displaying blocked items inside the popup.
 */
@CustomHTMLElement.registerCustomElement("popup-container")
export class PopupContainer extends CustomHTMLElement {
	override connectedCallback(): void {
		this.classList.add("container");
	}

	/**
	 * Append a title and buttons to the header.
	 *
	 * @param title The title to display in the title bar.
	 * @param buttons The buttons to add alongside the title.
	 * @returns This object for method chaining.
	 */
	appendToHeader(title: HTMLElement, ...buttons: Array<HTMLElement>) {
		const icons = new ElementBuilder("div")
			.class("title-bar-buttons")
			.children(...buttons)
			.build();
		const header = new ElementBuilder("header")
			.children(title, icons)
			.class("title-bar")
			.build();

		this.append(header);
		return this;
	}

	/**
	 * Append elements as children of the main section of this container.
	 *
	 * @param children The children to append into the main section.
	 * @returns This object for method chaining.
	 */
	appendToMain(...children: Array<HTMLElement>) {
		const main = new ElementBuilder("main").children(...children).build();
		this.append(main);
		return this;
	}
}
