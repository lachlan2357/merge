import { CustomHTMLElement } from "./index.js";

/**
 * Icon element providing an interface to a FontAwesomeIcon.
 */
@CustomHTMLElement.registerCustomElement("fa-icon")
export class FontAwesomeIcon extends CustomHTMLElement {
	static readonly observedAttributes = ["family", "icon", "animation"];

	/**
	 * Underlying {@link HTMLElement} which FontAwesome uses to display icons.
	 */
	private readonly icon = document.createElement("i");

	connectedCallback() {
		const shadow = this.attachShadow({ mode: "closed" });

		// set default family if none is specified
		if (this.getAttribute("family") === null) this.setFamily("solid");

		// required stylesheets
		const fontawesomeCss = document.createElement("link");
		fontawesomeCss.href = "/merge/fontawesome/css/all.min.css";
		fontawesomeCss.rel = "stylesheet";

		shadow.append(fontawesomeCss, this.icon);
	}

	attributeChangedCallback(attribute: string, oldValue: string | null, newValue: string | null) {
		switch (attribute) {
			case "family":
			case "icon":
			case "animation": {
				if (oldValue !== null) this.icon.classList.remove(`fa-${oldValue}`);
				if (newValue !== null) this.icon.classList.add(`fa-${newValue}`);
				break;
			}
			default:
				return super.attributeChangedCallback(attribute, oldValue, newValue);
		}
	}

	setFamily(family: string) {
		this.setAttribute("family", family);
		return this;
	}

	/**
	 * Set the icon for this container.
	 *
	 * {@link icon} needs to be a valid FontAwesome icon. See https://fontawesome.com/icons/ for
	 * available icons.
	 *
	 * @param icon The name of the icon.
	 * @returns This object for method chaining.
	 */
	setIcon(icon: string) {
		this.setAttribute("icon", icon);
		return this;
	}

	/**
	 * Set the animation for this container.
	 *
	 * {@link animation} needs to be a valid FontAwesome animation. See
	 * https://docs.fontawesome.com/web/style/animate for available animations.
	 *
	 * @param animation The name of the animation.
	 * @returns This object for method chaining.
	 */
	setAnimation(animation: string | null) {
		if (animation === null) this.removeAttribute("animation");
		else this.setAttribute("animation", animation ?? "");
		return this;
	}
}
