import { ElementBuilder } from "../elements.js";
import { createCustomElement } from "../supplement/elements.js";
import { FontAwesomeIcon } from "./icon.js";
import { CustomHTMLElement } from "./index.js";

/** Quick creation of a chip that acts as a link. */
@CustomHTMLElement.registerCustomElement("link-chip")
export class LinkChip extends CustomHTMLElement {
	/** The {@link HTMLAnchorElement} acting as the actual link. */
	private readonly anchor = new ElementBuilder("a");

	/** The {@link HTMLSpanElement} for the link label. */
	private readonly text = new ElementBuilder("span");

	/** The {@link FontAwesomeIcon} to add. */
	private readonly icon = createCustomElement(FontAwesomeIcon);

	override connectedCallback() {
		this.anchor.addClasses("link-chip");
		this.anchor.children(this.text.build(), this.icon);
		this.append(this.anchor.build());
	}

	/**
	 * Set the URL of the chip.
	 *
	 * @param url The URL to set.
	 * @returns This object for method chaining.
	 */
	setUrl(url: string) {
		this.anchor.href(url).setExternalLink();
		return this;
	}

	/**
	 * Set the label of this chip.
	 *
	 * @param text The label text to set.
	 * @returns This object for method chaining.
	 */
	setLabel(text: string) {
		this.text.text(text);
		return this;
	}

	/**
	 * Set the icon for this chip.
	 *
	 * @param family The icon family to set.
	 * @param icon The icon to set.
	 * @returns This object for method chaining.
	 */
	setIcon(family: string, icon: string) {
		this.icon.setFamily(family).setIcon(icon);
		return this;
	}
}
