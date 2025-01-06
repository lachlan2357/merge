export class ElementBuilder {
    tag;
    element;
    constructor(tag) {
        this.tag = tag;
        this.element = document.createElement(tag);
    }
    anchorExternal() {
        if (this.is(this.element, "a"))
            this.element.target = "_blank";
    }
    attribute(key, value) {
        this.element.setAttribute(key, value);
        return this;
    }
    class(...classes) {
        for (let i = 0, n = classes.length; i < n; i++) {
            this.element.classList.add(classes[i]);
        }
        return this;
    }
    children(...children) {
        this.element.append(...children);
        return this;
    }
    event(event, fn) {
        this.element.addEventListener(event, fn);
        return this;
    }
    href(url) {
        if (this.is(this.element, "a"))
            this.element.href = url;
        return this;
    }
    id(id) {
        this.element.id = id;
        return this;
    }
    inputChecked(value) {
        if (this.is(this.element, "input"))
            this.element.checked = value;
        return this;
    }
    inputValue(value) {
        if (this.is(this.element, "input"))
            this.element.value = value;
        return this;
    }
    inputType(type) {
        if (this.is(this.element, "input"))
            this.element.type = type;
        return this;
    }
    src(src) {
        if (this.is(this.element, "img"))
            this.element.src = src;
        return this;
    }
    text(text) {
        this.element.textContent = text;
        return this;
    }
    tooltip(text) {
        this.element.setAttribute("tooltip", text);
        return this;
    }
    build() {
        return this.element;
    }
    is(element, tag) {
        return this.tag.toString() === tag.toString();
    }
}
export class FontAwesomeIcon {
    element;
    prefix;
    icon;
    constructor(prefix, icon) {
        this.element = document.createElement("i");
        this.prefix = prefix;
        this.icon = icon;
    }
    animate(animation) {
        this.element.classList.add(`fa-${animation}`);
        return this;
    }
    setPrefix(prefix) {
        this.prefix = prefix;
        return this;
    }
    setIcon(icon) {
        this.icon = icon;
        return this;
    }
    build() {
        if (!this.prefix || !this.icon)
            console.warn("FontAwesomeIcon: prefix or icon not set");
        this.element.classList.add(`fa-${this.prefix}`, `fa-${this.icon}`);
        return this.element;
    }
}
export class LinkChip {
    element;
    displayText;
    optionalIcon;
    constructor() {
        this.element = new ElementBuilder("a").class("link-chip");
        this.displayText = new ElementBuilder("span");
    }
    url(url) {
        this.element.href(url).anchorExternal();
        return this;
    }
    text(text) {
        this.displayText?.text(text);
        return this;
    }
    icon(icon) {
        this.optionalIcon = icon;
        return this;
    }
    build() {
        if (this.optionalIcon)
            this.element.children(this.optionalIcon.build());
        return this.element.children(this.displayText.build()).build();
    }
}
