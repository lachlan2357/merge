import { MessageBoxError } from "../messages.js";
export class OsmValue {
    inner;
    constructor(value) {
        this.inner = value;
    }
    get() {
        return this.inner;
    }
    maybe() {
        return new OsmMaybe(this);
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
            return OsmMaybe.unset();
        else
            return new constructor(value).maybe();
    }
    static fromArray(value, constructor, delimiter = ";") {
        if (value === undefined)
            return OsmMaybe.unset();
        return new OsmArray(value, constructor, delimiter).maybe();
    }
    static fromDoubleArray(value, constructor, innerDelimiter, outerDelimiter) {
        if (value === undefined)
            return OsmMaybe.unset();
        return new OsmDoubleArray(value, constructor, innerDelimiter, outerDelimiter).maybe();
    }
}
export class OsmMaybe {
    inner;
    constructor(value) {
        this.inner = value;
    }
    isSet() {
        return this.inner !== undefined;
    }
    get() {
        return this.inner;
    }
    static unset() {
        return new OsmMaybe(undefined);
    }
}
export class OsmBoolean extends OsmValue {
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
    fill(creator) {
        if (typeof creator === "function") {
            for (let i = 0; i < this.inner.length; i++)
                this.inner[0] = creator();
        }
        else {
            this.inner.fill(creator);
        }
    }
    static ofLength(length, value, constructor) {
        const arr = new Array(length);
        const osmArr = new OsmArray(arr, constructor);
        osmArr.fill(() => new constructor(value));
        return osmArr;
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
    fill(creator) {
        if (typeof creator === "function") {
            for (let i = 0; i < this.inner.length; i++)
                this.inner[0] = creator();
        }
        else {
            this.inner.fill(creator);
        }
    }
    static ofLength(length, value, constructor) {
        const arr = new Array();
        for (let i = 0; i < length; i++)
            arr.push(OsmArray.ofLength(1, value, constructor));
        const osmArr = new OsmDoubleArray(arr, constructor);
        return osmArr;
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
