import { MessageBoxError } from "../messages.js";

export interface ToString {
	toString(): string;
}

export type OsmConstructor<Value extends OsmValue<ToString>> = new (value: string) => Value;

export abstract class OsmValue<T extends ToString> {
	protected readonly inner: T;

	constructor(value: T) {
		this.inner = value;
	}

	get() {
		return this.inner;
	}

	eq(other: this | T) {
		if (other instanceof OsmValue) return this.cmp(other);
		return this.inner === other;
	}

	protected cmp(other: this): boolean {
		return this.inner === other.inner;
	}

	abstract toString(): string;

	static from<C extends OsmValue<T>, T extends ToString>(
		value: string | undefined,
		constructor: OsmConstructor<C>
	): C | undefined {
		if (value === undefined) return undefined;
		return new constructor(value);
	}

	static fromArray<T extends OsmValue<ToString>>(
		value: string | undefined,
		constructor: OsmConstructor<T>,
		delimiter: string = ";"
	): OsmArray<T> | undefined {
		if (value === undefined) return undefined;
		return new OsmArray(value, constructor, delimiter);
	}

	static fromDoubleArray<T extends OsmValue<ToString>>(
		value: string | undefined,
		constructor: OsmConstructor<T>,
		innerDelimiter?: string,
		outerDelimiter?: string
	): OsmDoubleArray<T> | undefined {
		if (value === undefined) return undefined;
		return new OsmDoubleArray(value, constructor, innerDelimiter, outerDelimiter);
	}
}

export class OsmBoolean extends OsmValue<boolean> {
	static readonly TRUE = new OsmBoolean(true);
	static readonly FALSE = new OsmBoolean(true);

	constructor(value: boolean | string) {
		if (typeof value === "boolean") super(value);
		else super(OsmBoolean.process(value));
	}

	private static process(value: string) {
		switch (value) {
			case "yes":
				return true;
			case "no":
				return false;
			default:
				throw new InvalidTagValueError("OsmBoolean", value);
		}
	}

	toString(): string {
		return this.inner ? "yes" : "no";
	}
}

export class OsmUnsignedInteger extends OsmValue<number> {
	constructor(value: number | string) {
		if (typeof value === "number") super(value);
		else super(OsmUnsignedInteger.process(value));
	}

	private static process(value: string) {
		const number = Number(value);
		if (Number.isNaN(number) || !Number.isInteger(number) || number < 0)
			throw new InvalidTagValueError("OsmUnsignedInteger", value);
		return number;
	}

	toString(): string {
		return this.inner.toString();
	}

	add(other: this | number) {
		return new OsmUnsignedInteger(
			this.inner + (other instanceof OsmUnsignedInteger ? other.inner : other)
		);
	}

	subtract(other: this | number) {
		return new OsmUnsignedInteger(
			this.inner - (other instanceof OsmUnsignedInteger ? other.inner : other)
		);
	}

	multiply(other: this | number) {
		return new OsmUnsignedInteger(
			this.inner * (other instanceof OsmUnsignedInteger ? other.inner : other)
		);
	}

	divide(other: this | number) {
		return new OsmUnsignedInteger(
			this.inner / (other instanceof OsmUnsignedInteger ? other.inner : other)
		);
	}

	mod(other: this | number) {
		return new OsmUnsignedInteger(
			this.inner % (other instanceof OsmUnsignedInteger ? other.inner : other)
		);
	}
}

export class OsmString extends OsmValue<string> {
	protected process(input: string): string {
		return input;
	}
	toString(): string {
		return this.inner;
	}
}

export class OsmArray<T extends OsmValue<ToString>> extends OsmValue<Array<T>> {
	protected readonly delimiter: string;

	constructor(value: Array<T> | string, constructor: OsmConstructor<T>, delimiter: string = ";") {
		if (value instanceof Array) super(value);
		else super(OsmArray.process(value, constructor, delimiter));

		this.delimiter = delimiter;
	}

	protected static process<T extends OsmValue<ToString>>(
		value: string,
		constructor: OsmConstructor<T>,
		delimiter: string
	): Array<T> {
		const values = value.split(delimiter).map(value => new constructor(value));
		return values;
	}

	toString(): string {
		return this.inner.map(value => value.toString()).join(this.delimiter);
	}
}

export class OsmDoubleArray<T extends OsmValue<ToString>> extends OsmValue<Array<OsmArray<T>>> {
	protected readonly innerDelimiter: string;
	protected readonly outerDelimiter: string;

	constructor(
		value: Array<OsmArray<T>> | string,
		constructor: OsmConstructor<T>,
		innerDelimiter: string = ";",
		outerDelimiter: string = "|"
	) {
		if (value instanceof Array) super(value);
		else super(OsmDoubleArray.process(value, constructor, innerDelimiter, outerDelimiter));

		this.innerDelimiter = innerDelimiter;
		this.outerDelimiter = outerDelimiter;
	}

	getBoth<O>(mapFn: (value: T) => O): Array<Array<O>> {
		return this.inner.map(value => value.get().map(mapFn));
	}

	protected static process<T extends OsmValue<ToString>>(
		value: string,
		constructor: OsmConstructor<T>,
		innerDelimiter: string,
		outerDelimiter: string
	): OsmArray<T>[] {
		return value
			.split(outerDelimiter)
			.map(value => new OsmArray(value, constructor, innerDelimiter));
	}

	toString(): string {
		return this.get()
			.map(value =>
				value
					.get()
					.map(value => value.toString())
					.join(this.innerDelimiter)
			)
			.join(this.outerDelimiter);
	}
}

class InvalidTagValueError extends MessageBoxError {
	constructor(type: string, value: string) {
		super(`Value '${value}' is not valid for type '${type}'.`);
	}
}
