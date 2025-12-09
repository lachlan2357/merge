/** Builder class to streamline construction and modification of a {@link HTMLElement}. */ export class ElementBuilder {
    /** The tag of the {@link HTMLElement} that was created. */ tag;
    /** The underlying {@link HTMLElement} this builder operates on. */ element;
    /**
	 * Create a new {@link ElementBuilder}.
	 *
	 * @param tag The tag of the {@link HTMLElement} to construct.
	 */ constructor(tag){
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
	 */ attribute(key, value) {
        this.element.setAttribute(key, value);
        return this;
    }
    /**
	 * Add CSS classes to the this element.
	 *
	 * @param classes The class names to add.
	 * @returns This object for method chaining.
	 */ addClasses(...classes) {
        this.element.classList.add(...classes);
        return this;
    }
    /**
	 * Append nodes as children to this element.
	 *
	 * @param children The children to append.
	 * @returns This object for method chaining.
	 */ children(...children) {
        this.element.append(...children);
        return this;
    }
    /**
	 * Register an event listener on this element.
	 *
	 * @param event The event to trigger {@link fn}.
	 * @param fn The callback function to run.
	 * @returns This object for method chaining.
	 */ event(event, fn) {
        this.element.addEventListener(event, fn);
        return this;
    }
    /**
	 * Set the ID of this element.
	 *
	 * @param id The ID to set.
	 * @returns This object for method chaining.
	 */ id(id) {
        this.element.id = id;
        return this;
    }
    /**
	 * Set the text content of the element.
	 *
	 * @param text The text to set.
	 * @returns This object for method chaining.
	 */ text(text) {
        this.element.textContent = text;
        return this;
    }
    /**
	 * Set a tooltip for this element.
	 *
	 * @param text The text to appear as the tooltip.
	 * @param location The location relative to the element where the tooltip will be displayed.
	 * @returns This object for method chaining.
	 */ tooltip(text, location) {
        this.element.ariaLabel = text;
        if (location !== undefined) this.element.setAttribute("data-tooltip", location);
        return this;
    }
    // anchor (requires "a")
    /**
	 * Set that this {@link HTMLAnchorElement} opens a new tab upon navigation.
	 *
	 * @returns This object for method chaining.
	 */ setExternalLink() {
        this.element.target = "_blank";
        return this;
    }
    /**
	 * Set the URL this link navigates to.
	 *
	 * @param url The URL to set.
	 * @returns This object for method chaining.
	 */ href(url) {
        this.element.href = url;
        return this;
    }
    // image (requires "img")
    /**
	 * Set the image source for this {@link HTMLImageElement}.
	 *
	 * @param src The image source to set.
	 * @returns This object for method chaining.
	 */ src(src) {
        this.element.src = src;
        return this;
    }
    // input (requires "input")
    /**
	 * Set the type of this {@link HTMLInputElement}.
	 *
	 * @param type The input type to set.
	 * @returns This object for method chaining.
	 */ inputType(type) {
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
	 */ setChecked(value) {
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
	 */ setValue(value) {
        this.element.value = value;
        return this;
    }
    /**
	 * Set that this {@link HTMLInputElement} requires a value to be valid.
	 *
	 * @returns This object for method chaining.
	 */ setRequired() {
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
	 */ build() {
        return this.element;
    }
}
