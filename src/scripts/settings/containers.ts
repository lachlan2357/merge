import { ElementBuilder } from "../elements.js";
import { MessageBoxError } from "../messages.js";
import { ToString } from "../types/osm.js";

/**
 * Containing for storing information about a particular application setting.
 */
export abstract class Setting<T extends ToString> {
	/**
	 * Set of all the keys already used by a setting.
	 *
	 * This set is populated upon the creation of each setting with its designated key. This allows
	 * this set to be checked against at the construction of each setting to ensure duplicated
	 * setting keys are not used.
	 */
	private static readonly registeredKeys = new Set<string>();

	/**
	 * The display name of this setting.
	 */
	readonly name: string;

	/**
	 * The key to use when storing persistent data.
	 */
	readonly key: string;

	/**
	 * A short description of what this setting changes.
	 */
	readonly description: string;

	/**
	 * Whether the value of this setting should be stored to persist across application sessions.
	 */
	readonly isPersistent: boolean;

	/**
	 * Whether this setting should appear and be modifiable by the user in the settings menu.
	 */
	readonly inSettingsMenu: boolean;

	/**
	 * The current value of this setting.
	 */
	private currentValue: T;

	/**
	 * The default value of this setting.
	 */
	private readonly defaultValue: T;

	get value() {
		return this.currentValue;
	}

	set value(newValue: T) {
		this.currentValue = newValue;
		this.save();
	}

	readonly inputElement: ElementBuilder<"input">;

	/**
	 * Create a new setting definition.
	 *
	 * @param name The display name of this setting.
	 * @param description A description of the function this setting changes.
	 * @param value The default value of this setting if it isn't fetched from persistent storage.
	 * @param isPersistent Whether this setting should be persistent across sessions.
	 * @param inSettingsMenu Whether this setting should appear in the settings menu.
	 */
	constructor(
		name: string,
		key: string,
		description: string,
		defaultValue: T,
		isPersistent: boolean,
		inSettingsMenu: boolean
	) {
		this.name = name;
		this.key = key;
		this.description = description;
		this.isPersistent = isPersistent;
		this.inSettingsMenu = inSettingsMenu;

		// ensure setting names don't duplicate
		const hasDuplicateName = Setting.registeredKeys.has(name);
		if (hasDuplicateName) throw SettingError.duplicateSettingName(name);
		Setting.registeredKeys.add(name);

		// set initial value
		this.defaultValue = defaultValue;
		this.currentValue = this.load();

		// build input element
		this.inputElement = this.buildInputElement();
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
		if (!this.isPersistent || valueString === null) return this.defaultValue;

		// return processed value
		try {
			return this.process(valueString);
		} catch {
			return this.defaultValue;
		}
	}

	/**
	 * Save this value to {@link localStorage}, overwriting the value stored there.
	 *
	 * If {@link this.isPersistent} is `false`, nothing is written to {@link localStorage}.
	 */
	save() {
		if (!this.isPersistent) return;

		const valueString = this.value.toString();
		localStorage.setItem(this.key, valueString);
	}

	private buildInputElement() {
		const builder = new ElementBuilder("input").event("input", e => {
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
	 * Process an incoming `string` from {@link localStorage} into the correct setting type.
	 *
	 * @param valueString The `string` value to process
	 * @throws {SettingTypeError} If the value could not be processed.
	 * @returns The processed value.
	 */
	abstract process(input: string): T;

	/**
	 * Configure the {@link this.inputElement} to be specialised for this input type.
	 *
	 * @param builder The {@link ElementBuilder} configure.
	 */
	abstract configureInputElement(builder: ElementBuilder<"input">): void;

	/**
	 * Retrieve a new value for this container from a {@link HTMLInputElement}.
	 *
	 * @throws {SettingTypeError} If the value of the input field is not valid for this setting.
	 * @param input The {@link HTMLInputField} to retrieve the value from.
	 */
	protected abstract getValueFromInput(input: HTMLInputElement): T;
}

export class BooleanSetting extends Setting<boolean> {
	process(value: string) {
		switch (value) {
			case "true":
				return true;
			case "false":
				return false;
			default:
				throw SettingError.invalidValue(value, "boolean");
		}
	}

	configureInputElement(builder: ElementBuilder<"input">) {
		builder.inputType("checkbox").inputChecked(this.value);
	}

	protected getValueFromInput(input: HTMLInputElement) {
		return input.checked;
	}
}

export class UrlSetting extends Setting<URL> {
	process(value: string) {
		try {
			return new URL(value);
		} catch {
			throw SettingError.invalidValue(value, "url");
		}
	}

	configureInputElement(builder: ElementBuilder<"input">): void {
		builder.inputType("url").inputValue(this.value.toString());
	}

	protected getValueFromInput(input: HTMLInputElement) {
		return this.process(input.value);
	}
}

class SettingError extends MessageBoxError {
	static duplicateSettingName(name: string) {
		return new SettingError(
			`Attempted to create a setting called ${name} when a setting already exists with that name.`
		);
	}

	static invalidValue(value: string, type: string) {
		return new SettingError(`'${value}' is an invalid value for type ${type}.`);
	}
}
