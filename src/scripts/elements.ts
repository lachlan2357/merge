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

	setChecked(this: ElementBuilder<"input">, value: boolean) {
		this.element.checked = value;
		return this;
	}

	setValue(this: ElementBuilder<"input">, value: string) {
		this.element.value = value;
		return this;
	}

	inputType(this: ElementBuilder<"input">, type: string) {
		this.element.type = type;
		return this;
	}

	// build

	build() {
		return this.element;
	}
}

export class FontAwesomeIcon {
	protected element: HTMLElement;
	protected prefix?: string;
	protected icon?: string;

	constructor(prefix?: string, icon?: string) {
		this.element = document.createElement("i");
		this.prefix = prefix;
		this.icon = icon;
	}

	animate(animation: string) {
		this.element.classList.add(`fa-${animation}`);
		return this;
	}

	setPrefix(prefix: string) {
		this.prefix = prefix;
		return this;
	}

	setIcon(icon: string) {
		this.icon = icon;
		return this;
	}

	build() {
		if (!this.prefix || !this.icon) console.warn("FontAwesomeIcon: prefix or icon not set");

		this.element.classList.add(`fa-${this.prefix}`, `fa-${this.icon}`);
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
		if (this.optionalIcon) this.element.children(this.optionalIcon.build());
		return this.element.children(this.displayText.build()).build();
	}
}
