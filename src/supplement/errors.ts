import { Result } from "../index.js";
import { nullish } from "./index.js";

export class Ok<T> {
	data: T;
	ok: true;

	constructor(data: T) {
		this.data = data;
		this.ok = true;
	}

	unwrap() {
		return this.data;
	}
}

export class Err<E> {
	error: E;
	ok: false;

	constructor(error: E) {
		this.error = error;
		this.ok = false;
	}
}

export function resultConstructor<T>(data: T | undefined) {
	if (data === undefined) return new Err(undefined);
	else return new Ok(data);
}

export function isErr(obj: unknown): obj is Err<unknown> {
	try {
		const result = obj as Result<unknown, unknown>;
		if (nullish(result)) return false;
		return result.ok === false;
	} catch (e) {
		return false;
	}
}
