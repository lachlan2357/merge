import { MessageBoxError } from "../messages.js";
import { Maybe, MergeWayTagIn, MergeWayTagsIn } from "./structures-processed.js";

/** The requirements for a type to be able to be stored in an {@link OsmValue}. */
export interface OsmInnerValue {
	/** Convert this value into a string-representation of itself. */
	toString(): string;
}

/** Interface specifying how an {@link OsmValue} acting as an should behave. */
interface ArrayLike<T extends OsmInnerValue> {
	/** Retrieve the current length of this array. */
	get length(): number;

	/**
	 * Append a value to the end of this array.
	 *
	 * @param value The value to append.
	 */
	push(value: T): void;
}

/**
 * Type of the constructor function of any {@link OsmValue}.
 *
 * @template Value The specific derivative of {@link OsmValue} created by this constructor.
 */
type OsmConstructor<Value extends OsmValue<OsmInnerValue>> = new (value: string) => Value;

/**
 * Fetch the inner type of an {@link OsmValue}.
 *
 * @template OsmType The {@link OsmValue} type to fetch the inner type of.
 */
export type OsmInner<OsmType> = OsmType extends OsmValue<infer T> ? T : never;

/**
 * Fetch the appropriate {@link OsmValue} type for a certain {@link MergeWayTagIn}.
 *
 * @template Tag The tag to fetch the {@link OsmValue} type for.
 */
export type OsmValueForTag<Tag extends MergeWayTagIn> =
	MergeWayTagsIn[Tag] extends Maybe<infer OsmType extends OsmValue<OsmInnerValue>>
		? OsmType
		: never;

/**
 * Base container class to to store a value that can be converted to and from it's OpenStreetMap
 * representation.
 *
 * @template T The inner type to store the underlying value.
 */
export abstract class OsmValue<T extends OsmInnerValue> {
	/** The underlying data for this container. */
	protected readonly inner: T;

	/**
	 * Create a new {@link OsmValue}.
	 *
	 * @param value The initial value of ths container.
	 */
	constructor(value: T) {
		this.inner = value;
	}

	/**
	 * Retrieve the underlying data from this container.
	 *
	 * @returns The underlying data.
	 */
	get() {
		return this.inner;
	}

	/**
	 * Contain this {@link OsmValue} in a {@link OsmMaybe}.
	 *
	 * @returns This container wrapped in an {@link OsmMaybe}.
	 */
	maybe() {
		return new OsmMaybe<typeof this>(this);
	}

	/**
	 * Determine whether another value is equal to this container's value.
	 *
	 * @param other Either another {@link OsmValue} or {@link T} to compare with this container's
	 *   value.
	 * @returns Whether this container's value and {@link other} are equal.
	 */
	eq(other: this | T) {
		if (other instanceof OsmValue) return this.inner === other.inner;
		return this.inner === other;
	}

	/** Convert this container to its OpenStreetMap string representation. */
	abstract toString(): string;

	/**
	 * Import an OpenStreetMap string representation of a value into a container.
	 *
	 * @param value The string to import.
	 * @param constructor The class to contain {@link value}.
	 * @returns The new {@link OsmValue} containing {@link value}.
	 */
	static from<OsmType extends OsmValue<OsmInnerValue>>(
		value: string | undefined,
		constructor: OsmConstructor<OsmType>
	): OsmMaybe<OsmType> {
		if (value === undefined) return OsmMaybe.unset();
		else return new constructor(value).maybe();
	}

	/**
	 * Convert an OpenStreetMap string representation of an array value into an {@link OsmArray}.
	 *
	 * @param value The string to import.
	 * @param constructor The constructor for inner value of the array.
	 * @param delimiter The character to treat as a delimiter in {@link value}.
	 * @returns The new {@link OsmArray} containing {@link value}.
	 */
	static fromArray<T extends OsmValue<OsmInnerValue>>(
		value: string | undefined,
		constructor: OsmConstructor<T>,
		delimiter: string = ";"
	): OsmMaybe<OsmArray<T>> {
		if (value === undefined) return OsmMaybe.unset();
		return new OsmArray(value, constructor, delimiter).maybe();
	}

	/**
	 * Convert an OpenStreetMap string representation of an two-dimensions array value into an
	 * {@link OsmDoubleArray}.
	 *
	 * @param value The string to import.
	 * @param constructor The constructor for inner value of the array.
	 * @param innerDelimiter The character to treat as a delimiter between each cell in
	 *   {@link value}.
	 * @param outerDelimiter The character to treat as a delimiter between each row in {@link value}.
	 * @returns The new {@link OsmDoubleArray} containing {@link value}.
	 */
	static fromDoubleArray<T extends OsmValue<OsmInnerValue>>(
		value: string | undefined,
		constructor: OsmConstructor<T>,
		innerDelimiter?: string,
		outerDelimiter?: string
	): OsmMaybe<OsmDoubleArray<T>> {
		if (value === undefined) return OsmMaybe.unset();
		return new OsmDoubleArray(value, constructor, innerDelimiter, outerDelimiter).maybe();
	}
}

/**
 * Represent a {@link OsmValue} of maybe being present, or maybe not.
 *
 * @template OsmType The underlying type of the {@link OsmValue} to store.
 * @template OsmMaybeType The calculated type to contain both possibilities of data.
 */
export class OsmMaybe<
	OsmType extends OsmValue<OsmInnerValue>,
	OsmMaybeType extends OsmType | undefined = OsmType | undefined
> {
	/** The underlying data. */
	private readonly inner: OsmMaybeType;

	/**
	 * Create a new {@link OsmMaybe} container.
	 *
	 * @param value The value to store in this container.
	 */
	constructor(value: OsmMaybeType) {
		this.inner = value;
	}

	/**
	 * Determine whether the {@link OsmMaybe} stores a set {@link OsmValue}, and not `undefined`.
	 *
	 * @returns Whether this {@link OsmMaybe} contains an {@link OsmValue}.
	 */
	isSet(): this is OsmMaybe<OsmType, OsmType> {
		return this.inner !== undefined;
	}

	/**
	 * Retrieve the {@link OsmValue} stored in this {@link OsmMaybe}.
	 *
	 * In order to call this function, it must be certain that this {@link OsmMaybe} does not store
	 * `undefined`. This is usually done via a call to {@link isSet()} first.
	 *
	 * @returns The inner {@link OsmValue} stored.
	 */
	get(this: OsmMaybe<OsmType, OsmType>) {
		return this.inner;
	}

	/**
	 * Create a new {@link OsmMaybe} with an unset inner value.
	 *
	 * @returns The new {@link OsmMaybe}.
	 */
	static unset<OsmType extends OsmValue<OsmInnerValue>>() {
		return new OsmMaybe<OsmType>(undefined);
	}
}

/** {@link OsmValue} container representing a `boolean` data structure. */
export class OsmBoolean extends OsmValue<boolean> {
	constructor(value: boolean | string) {
		if (typeof value === "boolean") super(value);
		else super(OsmBoolean.process(value));
	}

	/**
	 * Process a OpenStreetMap string into a boolean.
	 *
	 * @param value The string value to process.
	 * @returns The `boolean` representation of {@link value}.
	 * @throws {InvalidTagValueError} If {@link value} is not a valid `boolean` representation.
	 */
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

/** {@link OsmValue} container representing a `uint` data structure. */
export class OsmUnsignedInteger extends OsmValue<number> {
	constructor(value: number | string) {
		if (typeof value === "number") super(value);
		else super(OsmUnsignedInteger.process(value));
	}

	/**
	 * Process a OpenStreetMap string into a unsigned integer.
	 *
	 * @param value The string value to process.
	 * @returns The `uint` representation of {@link value}.
	 * @throws {InvalidTagValueError} If {@link value} is not a valid `uint` representation.
	 */
	private static process(value: string) {
		const number = Number(value);
		if (Number.isNaN(number) || !Number.isInteger(number) || number < 0)
			throw new InvalidTagValueError("OsmUnsignedInteger", value);
		return number;
	}

	toString(): string {
		return this.inner.toString();
	}

	/**
	 * Add an {@link OsmUnsignedInteger} or `number` to this value.
	 *
	 * Note: {@link this} value is not modified during the calculation. Instead, a new object is
	 * returned.
	 *
	 * @param other The value to add.
	 * @returns A new {@link OsmUnsignedInteger} with the result of the calculation.
	 */
	add(other: this | number) {
		return new OsmUnsignedInteger(
			this.inner + (other instanceof OsmUnsignedInteger ? other.inner : other)
		);
	}

	/**
	 * Subtract an {@link OsmUnsignedInteger} or `number` from this value.
	 *
	 * Note: {@link this} value is not modified during the calculation. Instead, a new object is
	 * returned.
	 *
	 * @param other The value to subtract.
	 * @returns A new {@link OsmUnsignedInteger} with the result of the calculation.
	 */
	subtract(other: this | number) {
		return new OsmUnsignedInteger(
			this.inner - (other instanceof OsmUnsignedInteger ? other.inner : other)
		);
	}

	/**
	 * Subtract this value by an {@link OsmUnsignedInteger} or `number`.
	 *
	 * Note: {@link this} value is not modified during the calculation. Instead, a new object is
	 * returned.
	 *
	 * @param other The value to multiply this value by.
	 * @returns A new {@link OsmUnsignedInteger} with the result of the calculation.
	 */
	multiply(other: this | number) {
		return new OsmUnsignedInteger(
			this.inner * (other instanceof OsmUnsignedInteger ? other.inner : other)
		);
	}

	/**
	 * Divide this value by an {@link OsmUnsignedInteger} or number.
	 *
	 * Note: {@link this} value is not modified during the calculation. Instead, a new object is
	 * returned.
	 *
	 * @param other The value to divide this value by.
	 * @returns A new {@link OsmUnsignedInteger} with the result of the calculation.
	 */
	divide(other: this | number) {
		return new OsmUnsignedInteger(
			this.inner / (other instanceof OsmUnsignedInteger ? other.inner : other)
		);
	}

	/**
	 * Calculate the modulo of this value and a {@link OsmUnsignedInteger} or `number`.
	 *
	 * Note: {@link this} value is not modified during the calculation. Instead, a new object is
	 * returned.
	 *
	 * @param other The value to calculate the modulo of.
	 * @returns A new {@link OsmUnsignedInteger} with the result of the calculation.
	 */
	mod(other: this | number) {
		return new OsmUnsignedInteger(
			this.inner % (other instanceof OsmUnsignedInteger ? other.inner : other)
		);
	}
}

/** {@link OsmValue} container representing a `string` data structure. */
export class OsmString extends OsmValue<string> {
	toString(): string {
		return this.inner;
	}
}

/** {@link OsmValue} container representing a `array` data structure. */
export class OsmArray<T extends OsmValue<OsmInnerValue>>
	extends OsmValue<Array<T>>
	implements ArrayLike<T>
{
	/**
	 * The character representing the delimiter between values in the OpenStreetMap string
	 * representation.
	 */
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

	/**
	 * Map all values in this array to another value.
	 *
	 * Note: this array is not modified during the mapping process. Instead, a new {@link OsmArray}
	 * is returned.
	 *
	 * @param mapFn The function used to map individual values.
	 * @param constructor The class of each new constructed value.
	 * @returns The new mapped {@link OsmArray}.
	 */
	map<Out extends OsmValue<OsmInnerValue>>(
		mapFn: (value: T) => Out,
		constructor: OsmConstructor<Out>
	): OsmArray<Out> {
		const array = this.inner.map(mapFn);
		return new OsmArray(array, constructor, this.delimiter);
	}

	/**
	 * Process a OpenStreetMap string into an array.
	 *
	 * @param value The string value to process.
	 * @param constructor The class to construct each value into.
	 * @param delimiter The character to treat as a delimiter between values.
	 * @returns The `array` representation of {@link value}.
	 * @throws {InvalidTagValueError} If {@link value} is not a valid `array` representation.
	 */
	protected static process<T extends OsmValue<OsmInnerValue>>(
		value: string,
		constructor: OsmConstructor<T>,
		delimiter: string
	): Array<T> {
		const values = value.split(delimiter).map(value => new constructor(value));
		return values;
	}

	/**
	 * Fill all slots in this array with a value.
	 *
	 * @param creator The function used to create each value.
	 */
	fill(creator: (() => T) | T) {
		if (typeof creator === "function") {
			for (let i = 0; i < this.inner.length; i++) this.inner[0] = creator();
		} else {
			this.inner.fill(creator);
		}
	}

	/**
	 * Create a new {@link OsmArray} of a particular length, filled with a certain value.
	 *
	 * @param length The length of array to create.
	 * @param value The string-representation of the value to fill each slot with.
	 * @param constructor The class to process each {@link value}.
	 * @returns The new {@link OsmArray}.
	 */
	static ofLength<T extends OsmValue<OsmInnerValue>>(
		length: number,
		value: string,
		constructor: OsmConstructor<T>
	) {
		const arr = new Array<T>(length);
		const osmArr = new OsmArray(arr, constructor);
		osmArr.fill(() => new constructor(value));
		return osmArr;
	}

	toString(): string {
		return this.inner.map(value => value.toString()).join(this.delimiter);
	}
}

/** {@link OsmValue} container representing a two-dimensional `array` data structure. */
export class OsmDoubleArray<T extends OsmValue<OsmInnerValue>>
	extends OsmValue<Array<OsmArray<T>>>
	implements ArrayLike<OsmArray<T>>
{
	/**
	 * The character representing the delimiter between values in the OpenStreetMap string
	 * representation.
	 */
	protected readonly innerDelimiter: string;

	/**
	 * The character representing the delimiter between rows in the OpenStreetMap string
	 * representation.
	 */
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

	/**
	 * Retrieve the a mapped {@link Array<Array>}` from this value.
	 *
	 * @param mapFn The function to map the inner values.
	 * @returns The mapped double-array.
	 */
	getBoth<Out>(mapFn: (value: T) => Out): Array<Array<Out>> {
		return this.inner.map(value => value.get().map(mapFn));
	}

	push(value: OsmArray<T>) {
		this.inner.push(value);
	}

	/**
	 * Map all values in this double-array to another value.
	 *
	 * Note: this double-array is not modified during the mapping process. Instead, a new
	 * {@link OsmArray} is returned.
	 *
	 * @param mapFn The function used to map individual values.
	 * @param constructor The class of each new constructed value.
	 * @returns The new mapped {@link OsmDoubleArray}.
	 */
	map<Out extends OsmValue<OsmInnerValue>>(
		mapFn: (value: OsmArray<T>) => OsmArray<Out>,
		constructor: OsmConstructor<Out>
	): OsmDoubleArray<Out> {
		const array = this.inner.map(mapFn);
		return new OsmDoubleArray(array, constructor, this.innerDelimiter, this.outerDelimiter);
	}

	/**
	 * Create a new {@link OsmDoubleArray} of a particular length, filled with a certain value.
	 *
	 * @param length The length of double-array to create.
	 * @param value The string-representation of the value to fill each slot with.
	 * @param constructor The class to process each {@link value}.
	 * @returns The new {@link OsmArray}.
	 */
	static ofLength<T extends OsmValue<OsmInnerValue>>(
		length: number,
		value: string,
		constructor: OsmConstructor<T>
	) {
		const arr = new Array<OsmArray<T>>();
		for (let i = 0; i < length; i++) arr.push(OsmArray.ofLength(1, value, constructor));

		const osmArr = new OsmDoubleArray(arr, constructor);
		return osmArr;
	}

	/**
	 * Process a OpenStreetMap string into an double-array.
	 *
	 * @param value The string value to process.
	 * @param constructor The class to construct each value into.
	 * @param innerDelimiter The character to treat as a delimiter between values.
	 * @param outerDelimiter The character to treat as a delimiter between rows.
	 * @returns The `array2d` representation of {@link value}.
	 * @throws {InvalidTagValueError} If {@link value} is not a valid `array2d` representation.
	 */
	protected static process<T extends OsmValue<OsmInnerValue>>(
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

/** Error for when a OpenStreetMap string-representation cannot be imported into an {@link OsmValue}. */
class InvalidTagValueError extends MessageBoxError {
	/**
	 * Create a new {@link InvalidTagValueError}.
	 *
	 * @param type The type that was attempted to be created.
	 * @param value The value that was attempted to be processed.
	 */
	constructor(type: string, value: string) {
		super(`Value '${value}' is not valid for type '${type}'.`);
	}
}
