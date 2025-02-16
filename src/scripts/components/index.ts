/** Callback methods for WebComponents. */
interface CustomElementCallbacks {
	/** Callback for when this WebComponent is connected to the DOM. */
	connectedCallback(): void;

	/** Callback for when this WebComponent is disconnected from the DOM. */
	disconnectedCallback(): void;

	/** Callback for when this WebComponent is moved from one node to another. */
	adoptedCallback(): void;

	/**
	 * Callback for when a observed attribute of this WebComponent changes.
	 *
	 * For this callback to be dispatched, the implementing class must defined a static property
	 * called `observedAttributes` which contains an array of attributes which will be notified. If
	 * this array is not present, or a desired attribute is not present, this callback will not be
	 * dispatched.
	 *
	 * The implementing should always call `super.attributeChangedCallback(...)` as a fallback to
	 * any overridden function as to print a warning to console that a change in an attribute was
	 * observed without having any effect.
	 *
	 * @param attribute The attribute that changed.
	 * @param oldValue The previous value of the attribute before it was changed.
	 * @param newValue The value the attribute has changed to.
	 */
	attributeChangedCallback(
		attribute: string,
		oldValue: string | null,
		newValue: string | null
	): void;
}

/**
 * Class all WebComponents must inherit from.
 *
 * If a WebComponent chooses to inherit directly from {@link HTMLElement} instead of this class, it
 * will not be automatically registered as a WebComponent and this will have to be done manually.
 */
export abstract class CustomHTMLElement extends HTMLElement implements CustomElementCallbacks {
	connectedCallback() {}

	disconnectedCallback() {}

	adoptedCallback() {}

	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
		console.warn(
			`Observed attribute '${name}' on ${this} changed without being handled (${oldValue} => ${newValue}).`
		);
	}

	/**
	 * Generate a decorator to register a {@link CustomHTMLElement} as a custom element.
	 *
	 * @param tagName The tag to register the custom element as.
	 * @returns A decorator function to apply to the custom element class.
	 */
	static registerCustomElement(tagName: string) {
		return function (_value: unknown, context: ClassDecoratorContext<typeof HTMLElement>) {
			context.addInitializer(function (this: typeof HTMLElement) {
				customElements.define(tagName, this);
			});
		};
	}
}
