/**
 * Class all WebComponents must inherit from.
 *
 * If a WebComponent chooses to inherit directly from {@link HTMLElement} instead of this class, it
 * will not be automatically registered as a WebComponent and this will have to be done manually.
 */
export class CustomHTMLElement extends HTMLElement {
    connectedCallback() { }
    disconnectedCallback() { }
    adoptedCallback() { }
    attributeChangedCallback(name, oldValue, newValue) {
        console.warn(`Observed attribute '${name}' on ${this} changed without being handled (${oldValue} => ${newValue}).`);
    }
    /**
     * Generate a decorator to register a {@link CustomHTMLElement} as a custom element.
     *
     * @param tagName The tag to register the custom element as.
     * @returns A decorator function to apply to the custom element class.
     */
    static registerCustomElement(tagName) {
        return function (_value, context) {
            context.addInitializer(function () {
                customElements.define(tagName, this);
            });
        };
    }
}
