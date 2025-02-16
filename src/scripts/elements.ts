import { FontAwesomeIcon } from "./components/icon.js";

/** Builder class to streamline construction and modification of a {@link HTMLElement}. */
export class ElementBuilder<T extends keyof HTMLElementTagNameMap> {
	/** The tag of the {@link HTMLElement} that was created. */
	protected tag: T;

	/** The underlying {@link HTMLElement} this builder operates on. */
	protected element: HTMLElementTagNameMap[T];

	/**
	 * Create a new {@link ElementBuilder}.
	 *
	 * @param tag The tag of the {@link HTMLElement} to construct.
	 */
	constructor(tag: T) {
		this.tag = tag;
		this.element = document.createElement(tag);
	}

	// global

	/**
	 * Set the value of an attribute.
	 *
	 * @param key The attribute to set.
	 * @param value The value to set the attribute to.
	 * @returns This object for method chaining.
	 */
	attribute(key: string, value: string) {
		this.element.setAttribute(key, value);
		return this;
	}

	/**
	 * Add CSS classes to the this element.
	 *
	 * @param classes The class names to add.
	 * @returns This object for method chaining.
	 */
	addClasses(...classes: Array<string>) {
		this.element.classList.add(...classes);
		return this;
	}

	/**
	 * Append nodes as children to this element.
	 *
	 * @param children The children to append.
	 * @returns This object for method chaining.
	 */
	children(...children: Array<Node>) {
		this.element.append(...children);
		return this;
	}

	/**
	 * Register an event listener on this element.
	 *
	 * @param event The event to trigger {@link fn}.
	 * @param fn The callback function to run.
	 * @returns This object for method chaining.
	 */
	event<E extends keyof HTMLElementEventMap>(event: E, fn: EventListenerOrEventListenerObject) {
		this.element.addEventListener(event, fn);
		return this;
	}

	/**
	 * Set the ID of this element.
	 *
	 * @param id The ID to set.
	 * @returns This object for method chaining.
	 */
	id(id: string) {
		this.element.id = id;
		return this;
	}

	/**
	 * Set the text content of the element.
	 *
	 * @param text The text to set.
	 * @returns This object for method chaining.
	 */
	text(text: string) {
		this.element.textContent = text;
		return this;
	}

	/**
	 * Set a tooltip for this element.
	 *
	 * @param text The text to appear as the tooltip.
	 * @param location The location relative to the element where the tooltip will be displayed.
	 * @returns This object for method chaining.
	 */
	tooltip(text: string, location?: "left" | "right" | "top" | "bottom") {
		this.element.ariaLabel = text;
		if (location !== undefined) this.element.setAttribute("data-tooltip", location);
		return this;
	}

	// anchor (requires "a")

	/**
	 * Set that this {@link HTMLAnchorElement} opens a new tab upon navigation.
	 *
	 * @returns This object for method chaining.
	 */
	setExternalLink(this: ElementBuilder<"a">) {
		this.element.target = "_blank";
		return this;
	}

	/**
	 * Set the URL this link navigates to.
	 *
	 * @param url The URL to set.
	 * @returns This object for method chaining.
	 */
	href(this: ElementBuilder<"a">, url: string) {
		this.element.href = url;
		return this;
	}

	// image (requires "img")

	/**
	 * Set the image source for this {@link HTMLImageElement}.
	 *
	 * @param src The image source to set.
	 * @returns This object for method chaining.
	 */
	src(this: ElementBuilder<"img">, src: string) {
		this.element.src = src;
		return this;
	}

	// input (requires "input")

	/**
	 * Set the type of this {@link HTMLInputElement}.
	 *
	 * @param type The input type to set.
	 * @returns This object for method chaining.
	 */
	inputType(this: ElementBuilder<"input">, type: string) {
		this.element.type = type;
		return this;
	}

	/**
	 * Set whether this checkbox is checked or not.
	 *
	 * Note: setting this value will only have an effect if the input type is set to `checkbox`.
	 *
	 * @param value Whether the checkbox should be checked.
	 * @returns This object for method chaining.
	 */
	setChecked(this: ElementBuilder<"input">, value: boolean) {
		this.element.checked = value;
		return this;
	}

	/**
	 * Set the input value of this {@link HTMLInputElement}.
	 *
	 * Note: setting this value will only have an effect if the input type supports text-based
	 * values.
	 *
	 * @param value The value to set.
	 * @returns This object for method chaining.
	 */
	setValue(this: ElementBuilder<"input">, value: string) {
		this.element.value = value;
		return this;
	}

	/**
	 * Set that this {@link HTMLInputElement} requires a value to be valid.
	 *
	 * @returns This object for method chaining.
	 */
	setRequired(this: ElementBuilder<"input">) {
		this.element.required = true;
		return this;
	}

	// build

	/**
	 * Build this {@link ElementBuilder}.
	 *
	 * Under the hood, all modifications to {@link element} is one at the time each method is called,
	 * so 'building' is merely returning the underlying {@link HTMLElement}.
	 *
	 * @returns The underlying {@link HTMLElement}.
	 */
	build() {
		return this.element;
	}
}

export class LinkChip {
	protected element: ElementBuilder<"a">;
	protected displayText: ElementBuilder<"span">;
	protected optionalIcon?: FontAwesomeIcon;

	constructor() {
		this.element = new ElementBuilder("a").addClasses("link-chip");
		this.displayText = new ElementBuilder("span");
	}

	url(url: string) {
		this.element.href(url).setExternalLink();
		return this;
	}

	text(text: string) {
		this.displayText?.text(text);
		return this;
	}

	icon(icon: FontAwesomeIcon) {
		this.optionalIcon = icon;
		return this;
	}

	build() {
		if (this.optionalIcon) this.element.children(this.optionalIcon);
		return this.element.children(this.displayText.build()).build();
	}
}
