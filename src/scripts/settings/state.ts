import { MessageBoxError } from "../messages.js";
import { SettingContainer } from "./types.js";

/**
 * Containing for storing information about a particular application setting.
 */
export class Setting<T> {
	/**
	 * Set of all the names setting names already used.
	 *
	 * This set is populated upon the creation of each setting with its designated name while also
	 * being checked to ensure the name hasn't already been registered.
	 */
	private static readonly registeredSettingNames = new Set<string>();

	/**
	 * The current value of this setting.
	 */
	private inner: SettingContainer<T>;

	get value() {
		return this.inner;
	}

	/**
	 * Create a new setting definition.
	 *
	 * @param name The name of this setting.
	 * @param description A description of the function this setting changes.
	 * @param value The default value of this setting if it isn't fetched from persistent storage.
	 * @param isPersistent Whether this setting should be persistent across sessions.
	 * @param inSettingsMenu Whether this setting should appear in the settings menu.
	 */
	constructor(
		readonly name: string,
		readonly description: string,
		defaultValue: SettingContainer<T>,
		readonly isPersistent: boolean,
		readonly inSettingsMenu: boolean
	) {
		// ensure setting names don't duplicate
		const hasDuplicateName = Setting.registeredSettingNames.has(name);
		if (hasDuplicateName) throw SettingError.duplicateSettingName(name);
		Setting.registeredSettingNames.add(name);

		// set initial value
		this.inner = defaultValue;
		if (isPersistent) this.inner.loadFromLocalStorage(name);
	}
}

class SettingError extends MessageBoxError {
	static duplicateSettingName(name: string) {
		return new SettingError(
			`Attempted to create a setting called ${name} when a setting already exists with that name.`
		);
	}
}
