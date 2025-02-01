import { CustomHTMLElement } from "./base.js";

export class FontAwesomeIcon extends CustomHTMLElement {
	static readonly observedAttributes = ["icon", "animation"];

	/**
	 * Underlying {@link HTMLElement} which FontAwesome uses to display icons.
	 */
	private readonly icon = document.createElement("i");

	connectedCallback() {
		const shadow = this.attachShadow({ mode: "closed" });

		// setup icon
		this.icon.classList.add("fa-solid");

		// required stylesheet
		const fontawesomeCss = document.createElement("link");
		fontawesomeCss.href = "/merge/fontawesome/css/fontawesome.css";
		fontawesomeCss.rel = "stylesheet";

		shadow.append(fontawesomeCss, this.icon);
	}

	attributeChangedCallback(attribute: string, oldValue: string | null, newValue: string | null) {
		switch (attribute) {
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

	setIcon(icon: string) {
		this.setAttribute("icon", icon);
	}

	setAnimation(animation: string | null) {
		if (animation === null) this.removeAttribute("animation");
		else this.setAttribute("animation", animation ?? "");
	}
}
