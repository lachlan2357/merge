interface CustomElementCallbacks {
	connectedCallback(): void;

	disconnectedCallback(): void;

	adoptedCallback(): void;

	attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
}

export abstract class CustomHTMLElement extends HTMLElement implements CustomElementCallbacks {
	connectedCallback() {}
	disconnectedCallback() {}
	adoptedCallback() {}
	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		console.warn(
			`Observed attribute '${name}' on ${this} changed without being handled (${oldValue} => ${newValue}).`
		);
	}
}
