/**
 * Constructor signature of a {@link HTMLElement} or any children.
 */
export type ElementConstructor<E extends HTMLElement> = new () => E;

/**
 * Retrieve an element from the DOM, ensuring it is of an expected class.
 *
 * @param id The ID of the element to retrieve.
 * @param constructor The expected type of the element.
 * @param parent The parent to search for an element in. If omitted, search is done globally.
 * @throws {ElementError} If the retrieval was unsuccessful.
 * @returns The element if successfully found.
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
}
