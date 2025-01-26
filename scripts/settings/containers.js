import { ElementBuilder } from "../elements.js";
import { MessageBoxError } from "../messages.js";
/**
 * Container for storing information about a particular application setting.
 *
 * @template T The type for the underlying data this container stores.
 */
export class Setting {
    /**
     * Set of all the keys already used by a setting.
     *
     * This set is populated upon the creation of each setting with its designated key. This allows
     * this set to be checked against at the construction of each setting to ensure duplicated
     * setting keys are not used.
     */
    static #registeredKeys = new Set();
    /**
     * The display name of this setting.
     */
    name;
    /**
     * The key to use when storing persistent data.
     */
    key;
    /**
     * A short description of what this setting changes.
     */
    description;
    /**
     * Whether the value of this setting should be stored to persist across application sessions.
     */
    isPersistent;
    /**
     * Whether this setting should appear and be modifiable by the user in the settings menu.
     */
    inSettingsMenu;
    /**
     * The default value of this setting.
     */
    #defaultValue;
    #onChange;
    /**
     * The current value of this setting.
     */
    #currentValue;
    /**
     * Retrieve the underlying data from this container.
     *
     * @returns The current value of the underlying data.
     */
    get value() {
        return this.#currentValue;
    }
    /**
     * Overwrite the value stored in this container with a new one.
     *
     * Setting the value will cause the new value to be saved in {@link localStorage}, provided
     * {@link isPersistent} is `true`.
     *
     * Setting this value will also cause the {@link inputElement} to have it's value set to the
     * new value. In almost all cases, since this value is being called from an event listener on
     * that element, it will functionally be redundant, however there is the possibility of the
     * value being set from elsewhere, in which this is necessary.
     *
     * @param newValue The new value to overwrite this container's value with.
     */
    set value(newValue) {
        this.#currentValue = newValue;
        // update state
        this.setInputValue();
        this.save();
        // call callback
        this.#onChange(this.#currentValue);
    }
    /**
     * The builder for the {@link HTMLInputElement} responsibly for allowing the user to change this
     * setting's value.
     */
    inputElement;
    /**
     * Create a new setting definition.
     *
     * @param name The display name of this setting.
     * @param key The key used when reading/writing to {@link localStorage}.
     * @param description A description of the function this setting changes.
     * @param value The default value of this setting if it isn't fetched from persistent storage.
     * @param isPersistent Whether this setting should be persistent across sessions.
     * @param inSettingsMenu Whether this setting should appear in the settings menu.
     * @param onChange A callback function to be called whenever the stored value changes.
     * @throws {SettingError} If {@link key} has already been registered in another setting.
     */
    constructor(name, key, description, defaultValue, isPersistent, inSettingsMenu, onChange = () => { }) {
        // store data
        this.name = name;
        this.key = key;
        this.description = description;
        this.isPersistent = isPersistent;
        this.inSettingsMenu = inSettingsMenu;
        this.#onChange = onChange;
        // ensure setting key isn't a duplicate
        const hasDuplicateKey = Setting.#registeredKeys.has(name);
        if (hasDuplicateKey)
            throw SettingError.duplicateSettingKey(name);
        Setting.#registeredKeys.add(name);
        // set initial value
        this.#defaultValue = defaultValue;
        this.#currentValue = defaultValue;
        this.load();
        // build input element
        this.inputElement = this.buildInputElement();
        this.setInputValue();
    }
    /**
     * Reset this setting to its {@link #defaultValue}.
     */
    reset() {
        this.value = this.#defaultValue;
    }
    /**
     * Load this value from {@link localStorage}, overwriting the currently stored value.
     *
     * If either {@link this.isPersistent} is `false`, there doesn't exist a value stored in
     * {@link localStorage} or the value stored cannot be processed correctly, the currently stored
     * value is not updated.
     */
    load() {
        // retrieve value from localstorage, if applicable
        const valueString = localStorage.getItem(this.key);
        if (!this.isPersistent || valueString === null)
            return;
        // set processed value, if valid
        try {
            this.#currentValue = this.process(valueString);
        }
        catch {
            return;
        }
    }
    /**
     * Save this value to {@link localStorage}, overwriting the value stored there.
     *
     * If {@link this.isPersistent} is `false`, nothing is written to {@link localStorage}.
     */
    save() {
        if (!this.isPersistent)
            return;
        const valueString = this.value.toString();
        localStorage.setItem(this.key, valueString);
    }
    /**
     * Construct the {@link inputElement} responsible for updating the value of this setting.
     *
     * @returns The {@link ElementBuilder} for this element.
     */
    buildInputElement() {
        const builder = new ElementBuilder("input").event("input", e => {
            // ensure target is the input element
            const input = e.target;
            if (!(input instanceof HTMLInputElement))
                return;
            // set new value if valid
            try {
                this.value = this.getValueFromInput(input);
            }
            catch {
                return;
            }
        });
        this.configureInputElement(builder);
        return builder;
    }
}
/**
 * Container for storing a setting represented as a boolean.
 */
export class BooleanSetting extends Setting {
    configureInputElement(builder) {
        builder.inputType("checkbox");
    }
    process(value) {
        switch (value) {
            case "true":
                return true;
            case "false":
                return false;
            default:
                throw SettingError.invalidValue(value, "boolean");
        }
    }
    getValueFromInput(input) {
        return input.checked;
    }
    setInputValue() {
        this.inputElement.setChecked(this.value);
    }
}
/**
 * Container for storing a setting represented as a url.
 */
export class UrlSetting extends Setting {
    configureInputElement(builder) {
        builder.inputType("url").setRequired();
    }
    process(value) {
        try {
            if (value === "")
                throw null;
            return new URL(value);
        }
        catch {
            throw SettingError.invalidValue(value, "url");
        }
    }
    getValueFromInput(input) {
        return this.process(input.value);
    }
    setInputValue() {
        this.inputElement.setValue(this.value.toString());
    }
}
class SettingError extends MessageBoxError {
    /**
     * Error constructor for when a setting is created with a key that has already been registered.
     *
     * @param key The key that was attempted to be used.
     * @returns The error.
     */
    static duplicateSettingKey(key) {
        return new SettingError(`Attempted to create a setting with key '${key}' when a setting already exists with that key.`);
    }
    /**
     * Error constructor for when a setting's value is attempted to be updated with an invalid value.
     *
     * @param value The string value that was attempted to be converted.
     * @param type The type the string value was attempted to be converted into.
     * @returns The error.
     */
    static invalidValue(value, type) {
        return new SettingError(`'${value}' is an invalid value for type '${type}'.`);
    }
}
