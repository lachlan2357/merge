import { ElementConstructor } from "../supplement/elements.js";
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

/**
 * Mappings between declared WebComponents tags and classes.
 *
 * This type fulfils the same purpose as {@link HTMLElementTagNameMap} but for the WebComponents
 * defined in {@link CUSTOM_ELEMENTS}.
 */
type CustomElementTagNameMap = typeof CUSTOM_ELEMENTS;

/**
 * All valid tags for declared WebComponents.
 */
type CustomElementTag = keyof CustomElementTagNameMap;

/**
 * Mapping between a {@link CustomElementTag} and the class which is instantiated upon creation.
 */
type CustomElement<Tag extends CustomElementTag> = InstanceType<CustomElementTagNameMap[Tag]>;

/**
 * Determine whether a {@link tag} exists as the tag for a custom element.
 *
 * @param tag The tag to check.
 * @returns Whether {@link tag} is a custom element tag.
 */
export function isCustomElement(tag: string): tag is keyof typeof CUSTOM_ELEMENTS {
	return Object.keys(CUSTOM_ELEMENTS).includes(tag);
}

/**
 * Tracker to determine whether all WebComponents have been registered.
 *
 * This value is exclusively used by {@link registerCustomElements()} to determine, upon being
 * called, whether it has already been called and thus all WebComponents have already been
 * registered.
 */
let completedRegistration = false;

/**
 * Register all WebComponents if they haven't already been.
 *
 * Upon calling this method, all custom elements present in {@link CUSTOM_ELEMENTS} will be
 * registered as custom elements through the {@link customElements} API. On subsequent calls to
 * this method, nothing will occur as the elements have already been registered.
 */
export function registerCustomElements() {
	// ensure elements haven't already been registered
	if (completedRegistration) return;

	// register each component
	for (const tag of Object.keys(CUSTOM_ELEMENTS)) {
		if (!isCustomElement(tag)) continue;
		const constructor = CUSTOM_ELEMENTS[tag];
		customElements.define(tag, constructor);
	}

	// track registration as complete
	completedRegistration = true;
}

/**
 * Create an instance of the WebComponent for the specified tag.
 *
 * This method fulfils the same purpose as {@link document.createElement} but for WebComponents
 * defined in {@link CUSTOM_ELEMENTS}.
 *
 * @param tagName The tag of the WebComponent as defined in {@link CUSTOM_ELEMENTS}.
 * @returns The newly created WebComponent.
 */
export function createCustomElement<Tag extends CustomElementTag>(
	tagName: Tag
): CustomElement<Tag> {
	const element = document.createElement(tagName);
	const constructor = CUSTOM_ELEMENTS[tagName];
	if (element instanceof constructor) return element as CustomElement<Tag>;
	else throw WebComponentError.incorrectCreatedInstanceType(tagName, constructor, element);
}

/**
 * Errors which could occur relating to WebComponents
 */
class WebComponentError extends Error {
	/**
	 * Construct an error for when a WebComponent was created with an incorrect class.
	 *
	 * @param tagName The tag used to create the element.
	 * @param constructor The constructor which should have been used to create the WebComponent.
	 * @param element The element that was created.
	 * @returns The constructed {@link WebComponentError}.
	 */
	static incorrectCreatedInstanceType(
		tagName: CustomElementTag,
		constructor: ElementConstructor<HTMLElement>,
		element: HTMLElement
	) {
		// attempt to extract class name from element
		let className = element.toString();
		const matches = /\[object (.+?)\]/.exec(className);
		if (matches !== null) className = matches[1];

		return new WebComponentError(
			`WebComponent '${tagName.toLowerCase()}' did not create element with prototype of '${constructor.name}', instead created '${className}'.`
		);
	}
}
