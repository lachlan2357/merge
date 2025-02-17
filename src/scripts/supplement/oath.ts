type Constructor<T> = new (message?: string, options?: ErrorOptions) => T;

type OathFunction<T, E> = (
	this: void,
	resolve: (value: T | Promise<T>) => void,
	reject: (error: E) => void
) => void;

export type OathResult<T, E> = [T, null] | [null, E];

type OathMapFn<T, U> = (old: T) => U;

export class Oath<T, E extends Error> {
	private readonly oathFn: OathFunction<T, E>;
	private readonly ErrorConstructor: Constructor<E>;

	constructor(error: Constructor<E>, fn: OathFunction<T, E>) {
		this.oathFn = fn;
		this.ErrorConstructor = error;
	}

	map<U>(fn: OathMapFn<T, U>): Oath<U, E> {
		return new Oath<U, E>(this.ErrorConstructor, (resolve, reject) => {
			this.run()
				.then(([value, error]) => {
					if (error !== null) reject(error);
					else if (value !== null) resolve(fn(value));
					else throw OathError.noValueNorError();
				})
				.catch(e => {
					if (e instanceof this.ErrorConstructor) reject(e);
					else throw e;
				});
		});
	}

	mapError<F extends Error>(error: Constructor<F>, fn: OathMapFn<E, F>): Oath<T, F> {
		return new Oath<T, F>(error, (resolve, reject) => {
			this.run()
				.then(([value, error]) => {
					if (error !== null) reject(fn(error));
					else if (value !== null) resolve(value);
					else throw OathError.noValueNorError();
				})
				.catch(e => {
					if (e instanceof error) reject(e);
					else throw e;
				});
		});
	}

	async run(): Promise<OathResult<T, E>> {
		try {
			const result = await new Promise<T>(this.oathFn);
			return [result, null];
		} catch (e) {
			if (e instanceof this.ErrorConstructor) return [null, e];
			else throw e;
		}
	}
}

class OathError extends Error {
	static noValueNorError() {
		return new OathError("Oath returned neither a value nor an error.");
	}
}
