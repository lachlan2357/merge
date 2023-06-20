export class Ok<T> {
	data: T;
	ok: true;

	constructor(data: T) {
		this.data = data;
		this.ok = true;
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

export const AppErrMap = {} as const;

export type AppErr = keyof typeof AppErrMap;

export function getErr(key: AppErr) {
	return AppErrMap[key];
}
