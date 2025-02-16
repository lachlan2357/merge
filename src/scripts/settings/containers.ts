import { ElementBuilder } from "../elements.js";
import { MessageBoxError } from "../messages.js";
import { OsmInnerValue } from "../types/osm.js";

/**
 * Container for storing information about a particular application setting.
 *
 * @template T The type for the underlying data this container stores.
 */
export abstract class Setting<T extends OsmInnerValue> {
	/**
	 * Set of all the keys already used by a setting.
	 *
	 * This set is populated upon the creation of each setting with its designated key. This allows
	 * this set to be checked against at the construction of each setting to ensure duplicated
	 * setting keys are not used.
	 */
	static readonly #registeredKeys = new Set<string>();

	/** The display name of this setting. */
	readonly name: string;

	/** The key to use when storing persistent data. */
	readonly key: string;

	/** A short description of what this setting changes. */
	readonly description: string;

	/** Whether the value of this setting should be stored to persist across application sessions. */
	readonly isPersistent: boolean;

	/** Whether this setting should appear and be modifiable by the user in the settings menu. */
	readonly inSettingsMenu: boolean;

	/** The default value of this setting. */
	readonly #defaultValue: T;

	/** The method to run when the value of this setting changes. */
	readonly #onChange: (newValue: T) => void;

	/** The current value of this setting. */
	#currentValue: T;

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
	 * Setting the value will cause the new value to be saved in {@link window.localStorage},
	 * provided {@link isPersistent} is `true`.
	 *
	 * Setting this value will also cause the {@link inputElement} to have it's value set to the new
	 * value. In almost all cases, since this value is being called from an event listener on that
	 * element, it will functionally be redundant, however there is the possibility of the value
	 * being set from elsewhere, in which this is necessary.
	 *
	 * @param newValue The new value to overwrite this container's value with.
	 */
	set value(newValue: T) {
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
	readonly inputElement: ElementBuilder<"input">;

	/**
	 * Create a new setting definition.
	 *
	 * @param name The display name of this setting.
	 * @param key The key used when reading/writing to {@link window.localStorage}.
	 * @param description A description of the function this setting changes.
	 * @param defaultValue The default value of this setting if it isn't fetched from persistent
	 *   storage.
	 * @param isPersistent Whether this setting should be persistent across sessions.
	 * @param inSettingsMenu Whether this setting should appear in the settings menu.
	 * @param onChange A callback function to be called whenever the stored value changes.
	 * @throws {SettingError} If {@link key} has already been registered in another setting.
	 */
	constructor(
		name: string,
		key: string,
		description: string,
		defaultValue: T,
		isPersistent: boolean,
		inSettingsMenu: boolean,
		onChange: (newValue: T) => void = () => {}
	) {
		// store data
		this.name = name;
		this.key = key;
		this.description = description;
		this.isPersistent = isPersistent;
		this.inSettingsMenu = inSettingsMenu;
		this.#onChange = onChange;

		// ensure setting key isn't a duplicate
		const hasDuplicateKey = Setting.#registeredKeys.has(name);
		if (hasDuplicateKey) throw SettingError.duplicateSettingKey(name);
		Setting.#registeredKeys.add(name);

		// set initial value and run callback
		this.#defaultValue = defaultValue;
		this.#currentValue = defaultValue;
		this.load();
		this.save();
		this.#onChange(this.#currentValue);

		// build input element
		this.inputElement = this.buildInputElement();
		this.setInputValue();
	}

	/** Reset this setting to its default value. */
	reset() {
		this.value = this.#defaultValue;
	}

	/**
	 * Load this value from {@link window.localStorage}, overwriting the currently stored value.
	 *
	 * If either {@link isPersistent} is `false`, there doesn't exist a value stored in
	 * {@link window.localStorage} or the value stored cannot be processed correctly, the currently
	 * stored value is not updated.
	 */
	protected load() {
		// retrieve value from localstorage, if applicable
		const valueString = localStorage.getItem(this.key);
		if (!this.isPersistent || valueString === null) return;

		// set processed value, if valid
		try {
			this.#currentValue = this.process(valueString);
		} catch {
			return;
		}
	}

	/**
	 * Save this value to {@link window.localStorage}, overwriting the value stored there.
	 *
	 * If {@link isPersistent} is `false`, nothing is written to {@link window.localStorage}.
	 */
	protected save() {
		if (!this.isPersistent) return;

		const valueString = this.value.toString();
		localStorage.setItem(this.key, valueString);
	}

	/**
	 * Construct the {@link inputElement} responsible for updating the value of this setting.
	 *
	 * @returns The {@link ElementBuilder} for this element.
	 */
	private buildInputElement() {
		const builder = new ElementBuilder("input").event("input", e => {
			// ensure target is the input element
			const input = e.target;
			if (!(input instanceof HTMLInputElement)) return;

			// set new value if valid
			try {
				this.value = this.getValueFromInput(input);
			} catch {
				return;
			}
		});

		this.configureInputElement(builder);
		return builder;
	}

	/**
	 * Configure the {@link inputElement} to be specialised for this input type.
	 *
	 * @param builder The {@link ElementBuilder} configure.
	 */
	abstract configureInputElement(builder: ElementBuilder<"input">): void;

	/**
	 * Process an incoming `string` from {@link window.localStorage} into the correct setting type.
	 *
	 * @param input The `string` value to process.
	 * @returns The processed value.
	 * @throws {SettingTypeError} If the value could not be processed.
	 */
	protected abstract process(input: string): T;

	/**
	 * Retrieve a new value for this container from a {@link HTMLInputElement}.
	 *
	 * @param input The {@link HTMLInputElement} to retrieve the value from.
	 * @throws {SettingTypeError} If the value of the input field is not valid for this setting.
	 */
	protected abstract getValueFromInput(input: HTMLInputElement): T;

	/** Set the value of {@link inputElement} to the value stored in this container. */
	protected abstract setInputValue(): void;
}

/** Container for storing a setting represented as a boolean. */
export class BooleanSetting extends Setting<boolean> {
	configureInputElement(builder: ElementBuilder<"input">) {
		builder.inputType("checkbox");
	}

	protected process(value: string) {
		switch (value) {
			case "true":
				return true;
			case "false":
				return false;
			default:
				throw SettingError.invalidValue(value, "boolean");
		}
	}

	protected getValueFromInput(input: HTMLInputElement) {
		return input.checked;
	}

	protected setInputValue() {
		this.inputElement.setChecked(this.value);
	}
}

/** Container for storing a setting represented as a url. */
export class UrlSetting extends Setting<URL> {
	configureInputElement(builder: ElementBuilder<"input">): void {
		builder.inputType("url").setRequired();
	}

	protected process(value: string) {
		try {
			if (value === "") throw null;
			return new URL(value);
		} catch {
			throw SettingError.invalidValue(value, "url");
		}
	}

	protected getValueFromInput(input: HTMLInputElement) {
		return this.process(input.value);
	}

	protected setInputValue() {
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
	static duplicateSettingKey(key: string) {
		return new SettingError(
			`Attempted to create a setting with key '${key}' when a setting already exists with that key.`
		);
	}

	/**
	 * Error constructor for when a setting's value is attempted to be updated with an invalid
	 * value.
	 *
	 * @param value The string value that was attempted to be converted.
	 * @param type The type the string value was attempted to be converted into.
	 * @returns The error.
	 */
	static invalidValue(value: string, type: string) {
		return new SettingError(`'${value}' is an invalid value for type '${type}'.`);
	}
}
