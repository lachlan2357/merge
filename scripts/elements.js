export class ElementBuilder {
    tag;
    element;
    constructor(tag) {
        this.tag = tag;
        this.element = document.createElement(tag);
    }
    // global
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
    id(id) {
        this.element.id = id;
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
    // anchor (requires "a")
    setExternalLink() {
        this.element.target = "_blank";
        return this;
    }
    href(url) {
        this.element.href = url;
        return this;
    }
    // image (requires "img")
    src(src) {
        this.element.src = src;
        return this;
    }
    // input (requires "input")
    inputType(type) {
        this.element.type = type;
        return this;
    }
    setChecked(value) {
        this.element.checked = value;
        return this;
    }
    setValue(value) {
        this.element.value = value;
        return this;
    }
    setRequired() {
        this.element.required = true;
        return this;
    }
    // build
    build() {
        return this.element;
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
        this.element.href(url).setExternalLink();
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
