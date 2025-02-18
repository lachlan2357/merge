// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T> = new (...data: any[]) => T;

type OathResolveFunction<T> = (value: T | Promise<T>) => void;
type OathRejectFunction<E> = (value: E) => void;
type OathFunction<T, E> = (
	this: void,
	resolve: OathResolveFunction<T>,
	reject: OathRejectFunction<E>
) => void;

export type OathResult<T, E> = [T, null] | [null, E];

type OathMapFn<T, U, E extends Error> = (old: T) => U | Oath<U, E>;
type OathMapErrorFn<E, F> = (old: E) => F | undefined;

/**
 * Alternative to a bare {@link Promise} for handling asynchronous functions.
 *
 * {@link Oath} provides key advantages over using a {@link Promise}.
 *
 * - Expected errors are returned as values instead of just being thrown. Error management with a
 *   {@link Promise} involves wrapping `await new Promise(...)` within a try-catch block. While these
 *   block serve their purpose, they make flow control awkward. Instead, each {@link Oath} specifies
 *   a type of exception that is expected - that is, can be reasonably assumed to be possible. Then,
 *   any time this exception is thrown, it is returned as an error value rather than thrown as an
 *   exception, making it easier to know what errors are expected, and to deal with them before
 *   using the value returned. This also means, provided constructor parameters are valid,
 *   constructing an {@link Oath} will not throw an exception.
 * - Unlike a {@link Promise}, an {@link Oath} is not run as soon as it is defined. Instead, the
 *   function is stored until the {@link Oath.run()} method is called. Then, the asynchronous
 *   function run just as a {@link Promise} usually does. This allows for more flexibility with
 *   allowing extensibility of promises before they are executed and awaited.
 */
export class Oath<T, E extends Error> {
	/**
	 * The method used to evaluate this {@link Oath}.
	 *
	 * If, during the execution of {@link oathFn}, an exception is raised, one of two things will
	 * occur.
	 *
	 * - If the exception is an instance of {@link ErrorConstructor}, the {@link Oath} catches the
	 *   exception and instead returns the error as a value.
	 * - If the exception is not an instance of {@link ErrorConstructor}, the exception will be caught
	 *   and re-thrown.
	 */
	private readonly oathFn: OathFunction<T, E>;

	/**
	 * The constructor that errors will be tested against to determine whether they are expected.
	 *
	 * An expected error will be returned as a value instead of being thrown. See {@link Oath} for
	 * details.
	 */
	private readonly ErrorConstructor: Constructor<E>;

	/**
	 * Create a new {@link Oath}.
	 *
	 * @param error The type of error to treat as an expected error.
	 * @param fn The function to run to evaluate the {@link Oath}.
	 */
	constructor(error: Constructor<E>, fn: OathFunction<T, E>) {
		this.oathFn = fn;
		this.ErrorConstructor = error;
	}

	/**
	 * Map a successful result from this {@link Oath} to another value.
	 *
	 * Provided this {@link Oath} does not throw an exception, the provided {@link fn} will be run on
	 * the result of this {@link Oath}.
	 *
	 * @param fn The function to run on a successful result from this {@link Oath}.
	 * @returns A new {@link Oath} with the successful result mapped.
	 */
	map<U>(fn: OathMapFn<T, U, E>): Oath<U, E> {
		return new Oath<U, E>(this.ErrorConstructor, (resolve, reject) => {
			this.run()
				.then(([value, error]) => {
					if (error !== null) throw error;
					else if (value === null) throw OathError.noValueNorError();
					else {
						const newValue = fn(value);
						if (newValue instanceof Oath) return newValue.run();
						else resolve(newValue);
					}
				})
				.then(awaited => {
					if (awaited === undefined) return;

					const [value, error] = awaited;
					if (error !== null) throw error;
					else if (value !== null) resolve(value);
					else throw OathError.noValueNorError();
				})
				.catch(e => {
					if (e instanceof this.ErrorConstructor) reject(e);
					else throw e;
				});
		});
	}

	/**
	 * Map an error result from this {@link Oath} to another error.
	 *
	 * Provided this {@link Oath} does throws an expected exception, the provided {@link fn} will be
	 * run on the error of this {@link Oath}. In the case where {@link fn} does not return a result
	 * (instead returning `void`), the error will be treated as unexpected and be re-thrown.
	 *
	 * @param error The error type to map the error result to.
	 * @param fn The function to determine how to map the error.
	 * @returns A new {@link Oath} with the error result mapped.
	 */
	mapError<F extends Error>(error: Constructor<F>, fn: OathMapErrorFn<E, F>): Oath<T, F> {
		return new Oath<T, F>(error, (resolve, reject) => {
			this.run()
				.then(([value, error]) => {
					if (value !== null) resolve(value);
					else if (error === null) throw OathError.noValueNorError();
					else throw fn(error) ?? error;
				})
				.catch(e => {
					if (e instanceof error) reject(e);
					else throw e;
				});
		});
	}

	/**
	 * Execute this {@link Oath}.
	 *
	 * @returns The result of this {@link Oath} - either a successful or error result.
	 */
	async run(): Promise<OathResult<T, E>> {
		try {
			const result = await new Promise<T>(this.oathFn);
			return [result, null];
		} catch (e) {
			if (e instanceof this.ErrorConstructor) return [null, e];
			else throw e;
		}
	}

	/**
	 * Execute a function, mapping any exceptions thrown.
	 *
	 * @param fn The function to execute.
	 * @param catchFn The mapping function to attempt to convert the thrown error.
	 * @returns The value returned by {@link fn}.
	 * @throws {E} If an exception was thrown during execution of {@link fn}.
	 */
	static mapException<T, E extends Error>(fn: () => T, catchFn: (error: unknown) => E | void) {
		try {
			return fn();
		} catch (error) {
			const newError = catchFn(error);
			if (newError !== undefined) throw newError;
			else throw error;
		}
	}
}

/** Errors which could occur during usage of an {@link Oath}. */
class OathError extends Error {
	/**
	 * Error for when an {@link Oath} returns neither a successful or error result.
	 *
	 * This type of error usually indicates an issue with a provided {@link OathFunction}, possibly
	 * returning `null` as a valid successful value.
	 *
	 * @returns The constructed error.
	 */
	static noValueNorError() {
		return new OathError("Oath returned neither a value nor an error.");
	}
}
