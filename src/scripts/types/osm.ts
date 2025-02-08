import { MessageBoxError } from "../messages.js";

export interface ToString {
	toString(): string;
}

export interface ArrayLike<T extends ToString> {
	get length(): number;

	push(value: T): void;
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

	maybe() {
		return new OsmMaybe<typeof this>(this);
	}

	eq(other: this | T) {
		if (other instanceof OsmValue) return this.cmp(other);
		return this.inner === other;
	}

	protected cmp(other: this): boolean {
		return this.inner === other.inner;
	}

	abstract toString(): string;

	static from<OsmType extends OsmValue<ToString>>(
		value: string | undefined,
		constructor: OsmConstructor<OsmType>
	): OsmMaybe<OsmType> {
		if (value === undefined) return OsmMaybe.unset();
		else return new constructor(value).maybe();
	}

	static fromArray<T extends OsmValue<ToString>>(
		value: string | undefined,
		constructor: OsmConstructor<T>,
		delimiter: string = ";"
	): OsmMaybe<OsmArray<T>> {
		if (value === undefined) return OsmMaybe.unset();
		return new OsmArray(value, constructor, delimiter).maybe();
	}

	static fromDoubleArray<T extends OsmValue<ToString>>(
		value: string | undefined,
		constructor: OsmConstructor<T>,
		innerDelimiter?: string,
		outerDelimiter?: string
	): OsmMaybe<OsmDoubleArray<T>> {
		if (value === undefined) return OsmMaybe.unset();
		return new OsmDoubleArray(value, constructor, innerDelimiter, outerDelimiter).maybe();
	}
}

export class OsmMaybe<
	OsmType extends OsmValue<ToString>,
	OsmMaybeType extends OsmValue<ToString> | undefined = OsmType | undefined
> {
	private readonly inner: OsmMaybeType;

	constructor(value: OsmMaybeType) {
		this.inner = value;
	}

	isSet(): this is OsmMaybe<OsmType, OsmType> {
		return this.inner !== undefined;
	}

	get(this: OsmMaybe<OsmType, OsmType>) {
		return this.inner;
	}

	static unset<OsmType extends OsmValue<ToString>>() {
		return new OsmMaybe<OsmType>(undefined);
	}
}

export class OsmBoolean extends OsmValue<boolean> {
	static readonly TRUE = new OsmBoolean(true);
	static readonly FALSE = new OsmBoolean(false);

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

export class OsmArray<T extends OsmValue<ToString>>
	extends OsmValue<Array<T>>
	implements ArrayLike<T>
{
	protected readonly delimiter: string;

	get length() {
		return this.inner.length;
	}

	constructor(value: Array<T> | string, constructor: OsmConstructor<T>, delimiter: string = ";") {
		if (value instanceof Array) super(value);
		else super(OsmArray.process(value, constructor, delimiter));

		this.delimiter = delimiter;
	}

	push(value: T) {
		this.inner.push(value);
	}

	map<Out extends OsmValue<ToString>>(
		mapFn: (value: T) => Out,
		constructor: OsmConstructor<Out>
	): OsmArray<Out> {
		const array = this.inner.map(mapFn);
		return new OsmArray(array, constructor, this.delimiter);
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

export class OsmDoubleArray<T extends OsmValue<ToString>>
	extends OsmValue<Array<OsmArray<T>>>
	implements ArrayLike<OsmArray<T>>
{
	protected readonly innerDelimiter: string;
	protected readonly outerDelimiter: string;

	get length() {
		return this.inner.length;
	}

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

	getBoth<Out>(mapFn: (value: T) => Out): Array<Array<Out>> {
		return this.inner.map(value => value.get().map(mapFn));
	}

	push(value: OsmArray<T>) {
		this.inner.push(value);
	}

	map<Out extends OsmValue<ToString>>(
		mapFn: (value: OsmArray<T>) => OsmArray<Out>,
		constructor: OsmConstructor<Out>
	): OsmDoubleArray<Out> {
		const array = this.inner.map(mapFn);
		return new OsmDoubleArray(array, constructor, this.innerDelimiter, this.outerDelimiter);
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
