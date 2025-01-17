import { MessageBoxError } from "../messages.js";
export class OsmValue {
    inner;
    constructor(value) {
        this.inner = value;
    }
    get() {
        return this.inner;
    }
    eq(other) {
        if (other instanceof OsmValue)
            return this.cmp(other);
        return this.inner === other;
    }
    cmp(other) {
        return this.inner === other.inner;
    }
    static from(value, constructor) {
        if (value === undefined)
            return undefined;
        return new constructor(value);
    }
    static fromArray(value, constructor, delimiter = ";") {
        if (value === undefined)
            return undefined;
        return new OsmArray(value, constructor, delimiter);
    }
    static fromDoubleArray(value, constructor, innerDelimiter, outerDelimiter) {
        if (value === undefined)
            return undefined;
        return new OsmDoubleArray(value, constructor, innerDelimiter, outerDelimiter);
    }
}
export class OsmBoolean extends OsmValue {
    static TRUE = new OsmBoolean(true);
    static FALSE = new OsmBoolean(false);
    constructor(value) {
        if (typeof value === "boolean")
            super(value);
        else
            super(OsmBoolean.process(value));
    }
    static process(value) {
        switch (value) {
            case "yes":
                return true;
            case "no":
                return false;
            default:
                throw new InvalidTagValueError("OsmBoolean", value);
        }
    }
    toString() {
        return this.inner ? "yes" : "no";
    }
}
export class OsmUnsignedInteger extends OsmValue {
    constructor(value) {
        if (typeof value === "number")
            super(value);
        else
            super(OsmUnsignedInteger.process(value));
    }
    static process(value) {
        const number = Number(value);
        if (Number.isNaN(number) || !Number.isInteger(number) || number < 0)
            throw new InvalidTagValueError("OsmUnsignedInteger", value);
        return number;
    }
    toString() {
        return this.inner.toString();
    }
    add(other) {
        return new OsmUnsignedInteger(this.inner + (other instanceof OsmUnsignedInteger ? other.inner : other));
    }
    subtract(other) {
        return new OsmUnsignedInteger(this.inner - (other instanceof OsmUnsignedInteger ? other.inner : other));
    }
    multiply(other) {
        return new OsmUnsignedInteger(this.inner * (other instanceof OsmUnsignedInteger ? other.inner : other));
    }
    divide(other) {
        return new OsmUnsignedInteger(this.inner / (other instanceof OsmUnsignedInteger ? other.inner : other));
    }
    mod(other) {
        return new OsmUnsignedInteger(this.inner % (other instanceof OsmUnsignedInteger ? other.inner : other));
    }
}
export class OsmString extends OsmValue {
    process(input) {
        return input;
    }
    toString() {
        return this.inner;
    }
}
export class OsmArray extends OsmValue {
    delimiter;
    get length() {
        return this.inner.length;
    }
    constructor(value, constructor, delimiter = ";") {
        if (value instanceof Array)
            super(value);
        else
            super(OsmArray.process(value, constructor, delimiter));
        this.delimiter = delimiter;
    }
    push(value) {
        this.inner.push(value);
    }
    map(mapFn, constructor) {
        const array = this.inner.map(mapFn);
        return new OsmArray(array, constructor, this.delimiter);
    }
    static process(value, constructor, delimiter) {
        const values = value.split(delimiter).map(value => new constructor(value));
        return values;
    }
    toString() {
        return this.inner.map(value => value.toString()).join(this.delimiter);
    }
}
export class OsmDoubleArray extends OsmValue {
    innerDelimiter;
    outerDelimiter;
    get length() {
        return this.inner.length;
    }
    constructor(value, constructor, innerDelimiter = ";", outerDelimiter = "|") {
        if (value instanceof Array)
            super(value);
        else
            super(OsmDoubleArray.process(value, constructor, innerDelimiter, outerDelimiter));
        this.innerDelimiter = innerDelimiter;
        this.outerDelimiter = outerDelimiter;
    }
    getBoth(mapFn) {
        return this.inner.map(value => value.get().map(mapFn));
    }
    push(value) {
        this.inner.push(value);
    }
    map(mapFn, constructor) {
        const array = this.inner.map(mapFn);
        return new OsmDoubleArray(array, constructor, this.innerDelimiter, this.outerDelimiter);
    }
    static process(value, constructor, innerDelimiter, outerDelimiter) {
        return value
            .split(outerDelimiter)
            .map(value => new OsmArray(value, constructor, innerDelimiter));
    }
    toString() {
        return this.get()
            .map(value => value
            .get()
            .map(value => value.toString())
            .join(this.innerDelimiter))
            .join(this.outerDelimiter);
    }
}
class InvalidTagValueError extends MessageBoxError {
    constructor(type, value) {
        super(`Value '${value}' is not valid for type '${type}'.`);
    }
}
