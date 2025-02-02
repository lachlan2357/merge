import { FontAwesomeIcon } from "./components/icon.js";

export class ElementBuilder<T extends keyof HTMLElementTagNameMap> {
	protected tag: T;
	protected element: HTMLElementTagNameMap[T];

	constructor(tag: T) {
		this.tag = tag;
		this.element = document.createElement(tag);
	}

	// global

	attribute(key: string, value: string) {
		this.element.setAttribute(key, value);
		return this;
	}

	class(...classes: Array<string>) {
		for (let i = 0, n = classes.length; i < n; i++) {
			this.element.classList.add(classes[i]);
		}

		return this;
	}

	children(...children: Array<Node>) {
		this.element.append(...children);
		return this;
	}

	event<E extends keyof HTMLElementEventMap>(event: E, fn: EventListenerOrEventListenerObject) {
		this.element.addEventListener(event, fn);
		return this;
	}

	id(id: string) {
		this.element.id = id;
		return this;
	}

	text(text: string) {
		this.element.textContent = text;
		return this;
	}

	tooltip(text: string) {
		this.element.setAttribute("tooltip", text);
		return this;
	}

	// anchor (requires "a")

	setExternalLink(this: ElementBuilder<"a">) {
		this.element.target = "_blank";
		return this;
	}

	href(this: ElementBuilder<"a">, url: string) {
		this.element.href = url;
		return this;
	}

	// image (requires "img")

	src(this: ElementBuilder<"img">, src: string) {
		this.element.src = src;
		return this;
	}

	// input (requires "input")

	inputType(this: ElementBuilder<"input">, type: string) {
		this.element.type = type;
		return this;
	}

	setChecked(this: ElementBuilder<"input">, value: boolean) {
		this.element.checked = value;
		return this;
	}

	setValue(this: ElementBuilder<"input">, value: string) {
		this.element.value = value;
		return this;
	}

	setRequired(this: ElementBuilder<"input">) {
		this.element.required = true;
		return this;
	}

	// build

	build() {
		return this.element;
	}
}

export class LinkChip {
	protected element: ElementBuilder<"a">;
	protected displayText: ElementBuilder<"span">;
	protected optionalIcon?: FontAwesomeIcon;

	constructor() {
		this.element = new ElementBuilder("a").class("link-chip");
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
