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
    tooltip(text, direction) {
        this.element.ariaLabel = text;
        if (direction !== undefined)
            this.element.setAttribute("data-tooltip", direction);
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
            this.element.children(this.optionalIcon);
        return this.element.children(this.displayText.build()).build();
    }
}
