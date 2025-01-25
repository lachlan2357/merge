import { ElementBuilder } from "../elements.js";
import { MessageBoxError } from "../messages.js";

export abstract class SettingContainer<T> {
	/**
	 * The underlying data of this setting type.
	 */
	private inner: T;

	/**
	 * Retrieve the underlying setting value.
	 */
	get value() {
		return this.inner;
	}

	/**
	 * Set a new value for this setting.
	 */
	set value(newValue: T) {
		this.inner = newValue;
	}

	/**
	 * Create a new value container for a setting.
	 *
	 * {@link value} can be passed as two types:
	 *
	 * 1. If {@link value} is passed as a `string`, it will be first processed using implementation
	 * of {@link process}.
	 * 2. If {@link value} is passed as a value of type {@link T}, it will be immediately set as
	 * the inner value. Note for deriving classes who have {@link T} as `string`: the value will be
	 * always be processed.
	 *
	 * @param value The initial value to store.
	 */
	constructor(value: T | string) {
		if (typeof value === "string") this.inner = this.process(value);
		else this.inner = value;
	}

	/**
	 * Load this value from {@link localStorage}, overwriting the value set in {@link inner}.
	 *
	 * If there doesn't exist a value stored in {@link localStorage}, the inner value is not
	 * updated.
	 *
	 * @param key The key of the record to fetch the value from {@link localStorage} by.
	 */
	loadFromLocalStorage(key: string) {
		// fetch raw value
		const valueString = localStorage.getItem(key);
		if (valueString === null) return;

		// process and set value
		const value = this.process(valueString);
		this.inner = value;
	}

	/**
	 * Construct an input field that updates the value in this container.
	 */
	buildInputBox() {
		const builder = new ElementBuilder("input").event("change", e => {
			const input = e.target;
			if (!(input instanceof HTMLInputElement)) return;

			const newValue = this.retrieveInputValue(input);
			this.value = newValue;
		});

		this.setInputBox(builder);
		return builder;
	}

	protected abstract setInputBox(builder: ElementBuilder<"input">): void;

	/**
	 * Process an incoming `string` from {@link localStorage} into the correct setting type.
	 *
	 * @param valueString The `string` value to process
	 * @throws {SettingTypeError} If the value could not be processed.
	 * @returns The processed value.
	 */
	protected abstract process(valueString: string): T;

	/**
	 * Retrieve a new value for this container from a {@link HTMLInputElement}.
	 *
	 * @throws {SettingTypeError} If the value of the input field is not valid for this setting.
	 * @param input The {@link HTMLInputField} to retrieve the value from.
	 */
	protected abstract retrieveInputValue(input: HTMLInputElement): T;
}

export class BooleanSetting extends SettingContainer<boolean> {
	process(value: string) {
		switch (value) {
			case "true":
				return true;
			case "false":
				return false;
			default:
				throw SettingTypeError.invalidValue(value, "boolean");
		}
	}

	protected setInputBox(builder: ElementBuilder<"input">): void {
		builder.inputType("checkbox").inputChecked(this.value);
	}

	protected retrieveInputValue(input: HTMLInputElement) {
		return input.checked;
	}
}

export class UrlSetting extends SettingContainer<URL> {
	process(value: string) {
		try {
			return new URL(value);
		} catch {
			throw SettingTypeError.invalidValue(value, "url");
		}
	}

	protected setInputBox(builder: ElementBuilder<"input">): void {
		builder.inputType("text").inputValue(this.value.toString());
	}

	protected retrieveInputValue(input: HTMLInputElement): URL {
		return this.process(input.value);
	}
}

class SettingTypeError extends MessageBoxError {
	static invalidValue(value: string, type: string) {
		return new SettingTypeError(`'${value}' is an invalid value for type ${type}.`);
	}
}
