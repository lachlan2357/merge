/**
 * Constructor signature of a {@link HTMLElement} or any children.
 *
 * This constructor type is valid for any class inheriting from {@link HTMLElement}, including
 * WebComponents.
 */
export type ElementConstructor<E extends HTMLElement> = new () => E;

/**
 * Create an instance of a custom element of a specified class.
 *
 * @param constructor The constructor for the class of the element to create.
 * @returns The created element.
 * @throws {ElementError} If the element could not be created.
 */
export function createCustomElement<const CustomElement extends typeof HTMLElement>(
	constructor: CustomElement
): InstanceType<CustomElement> {
	// ensure tag for custom element is registered
	const tagName = customElements.getName(constructor);
	if (tagName === null) throw ElementError.nonExistantCustomElement(constructor);

	// create custom element and ensure class is correct
	const element = document.createElement(tagName);
	if (element instanceof constructor) return element as InstanceType<typeof constructor>;
	else throw ElementError.incorrectCreatedInstanceType(tagName, constructor, element);
}

/**
 * Retrieve an element from the DOM, ensuring it is of an expected class.
 *
 * This method can retrieve both standard HTML elements and custom WebComponents, so on each method
 * call, all custom WebComponents are registered with the DOM if they haven't already been in order
 * to be able to properly return an element of the correct class.
 *
 * @param id The ID of the element to retrieve.
 * @param constructor The expected type of the element.
 * @returns The element if successfully found.
 * @throws {ElementError} If the retrieval was unsuccessful.
 */
export function getElement<E extends HTMLElement>(id: string, constructor: ElementConstructor<E>) {
	// find element
	const element = document.getElementById(id);
	if (element === null) throw ElementError.notFound(id);

	// check element is of correct type
	if (element instanceof constructor) return element;
	else throw ElementError.incorrectType(id, element, constructor);
}

/**
 * Errors which could occur during element retrieval.
 */
class ElementError extends Error {
	/**
	 * Construct an error for when an element could not be found by ID.
	 *
	 * @param id The ID of the element.
	 * @returns The constructed {@link ElementError}.
	 */
	static notFound(id: string) {
		return new ElementError(`Element with ID '${id}' could not be found.`);
	}

	/**
	 * Construct an error for when an element is not of the correct class.
	 *
	 * @param id The ID of the element.
	 * @param element The element which was found.
	 * @param constructor The expected class of the element.
	 * @returns The constructed {@link ElementError}.
	 */
	static incorrectType(
		id: string,
		element: HTMLElement,
		constructor: ElementConstructor<HTMLElement>
	) {
		return new ElementError(
			`Element with ID '${id}' has tag '${element.tagName.toLowerCase()}' and is not an instance of '${constructor.name}'.`
		);
	}

	/**
	 * Construct an error for when a custom element is created without being registered.
	 *
	 * @param constructor The element that was requested to be created.
	 * @returns The constructed {@link ElementError}.
	 */
	static nonExistantCustomElement(constructor: typeof HTMLElement) {
		return new ElementError(
			`'${constructor.name}' as not been registered as a custom element and cannot be initialised.`
		);
	}

	/**
	 * Construct an error for when a WebComponent was created with an incorrect class.
	 *
	 * @param tagName The tag used to create the element.
	 * @param constructor The constructor which should have been used to create the WebComponent.
	 * @param element The element that was created.
	 * @returns The constructed {@link ElementError}.
	 */
	static incorrectCreatedInstanceType(
		tagName: string,
		constructor: ElementConstructor<HTMLElement>,
		element: HTMLElement
	) {
		// attempt to extract class name from element
		let className = element.toString();
		const matches = /\[object (.+?)\]/.exec(className);
		if (matches !== null) className = matches[1];

		return new ElementError(
			`WebComponent '${tagName.toLowerCase()}' did not create element with prototype of '${constructor.name}', instead created '${className}'.`
		);
	}
}
