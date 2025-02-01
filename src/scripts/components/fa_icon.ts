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

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		switch (name) {
			case "icon":
			case "animation": {
				const oldClassName = `fa-${oldValue}`;
				const newClassName = `fa-${newValue}`;

				if (oldValue !== "") this.icon.classList.remove(oldClassName);
				if (newValue !== "") this.icon.classList.add(newClassName);
				break;
			}
			default:
				return super.attributeChangedCallback(name, oldValue, newValue);
		}
	}
}
