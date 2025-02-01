import { CustomHTMLElement } from "./base.js";
import { FontAwesomeIcon } from "./fa_icon.js";

/**
 * Declaration of all custom elements defined in this application.
 *
 * Registering a custom element here will automatically have it registered as a custom element once
 * {@link registerCustomElements()} has been called.
 */
const CUSTOM_ELEMENTS = {
	"fa-icon": FontAwesomeIcon
} satisfies Record<string, typeof CustomHTMLElement>;

type CustomElementMap = typeof CUSTOM_ELEMENTS;

/**
 * Determine whether a {@link tag} exists as the tag for a custom element.
 *
 * @param tag The tag to check.
 * @returns Whether {@link tag} is a custom element tag.
 */
function isCustomElement(tag: string | number | symbol): tag is keyof typeof CUSTOM_ELEMENTS {
	return Object.keys(CUSTOM_ELEMENTS).includes(tag.toString());
}

export function registerCustomElements() {
	for (const tag of Object.keys(CUSTOM_ELEMENTS)) {
		if (!isCustomElement(tag)) continue;
		const constructor = CUSTOM_ELEMENTS[tag];
		customElements.define(tag, constructor);
	}
}

export function createCustomElement<K extends keyof CustomElementMap>(
	tagName: K
): InstanceType<CustomElementMap[K]> {
	const element = document.createElement(tagName);
	const constructor = CUSTOM_ELEMENTS[tagName];
	if (element instanceof constructor) return element as InstanceType<CustomElementMap[K]>;
	else throw CustomComponentError.incorrectCreatedInstanceType(tagName, constructor, element);
}

class CustomComponentError extends Error {
	static incorrectCreatedInstanceType(
		tagName: keyof CustomElementMap,
		constructor: typeof HTMLElement,
		element: HTMLElement
	) {
		let className = element.toString();
		const matches = /\[object (.+?)\]/.exec(className);
		if (matches !== null) className = matches[1];

		return new CustomComponentError(
			`Custom Element '${tagName.toLowerCase()}' did not create element with prototype of '${constructor.name}', instead created '${className}'.`
		);
	}
}
