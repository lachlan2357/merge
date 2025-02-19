export type Constructor<T> = new (...data: never[]) => T;

type OathResolveFunction<T> = (value: T | Promise<T>) => void;
type OathRejectFunction<E> = (value: E) => void;
type OathChuckFunction = (value: unknown) => void;
type OathResolvers<T, E> = {
	resolve: OathResolveFunction<T>;
	reject: OathRejectFunction<E>;
	chuck: OathChuckFunction;
};
type OathFunction<T, E> = (this: void, resolvers: OathResolvers<T, E>) => void;
type OathFunctionSync<T> = (this: void) => T;
type OathFunctionAsync<T> = (this: void) => Promise<T>;

export const OATH_NULL = Symbol("Representing a null return value in an OathResult.");
export type OathResult<T, E> = [T, typeof OATH_NULL] | [typeof OATH_NULL, E];

type OathMapFn<T, U, E extends Error> = (old: T) => U | Oath<U, E>;
type OathMapErrorFn<E, F> = (old: E) => F | undefined;

/**
 * Alternative to a bare {@link Promise} for handling asynchronous functions.
 *
 * The premise of {@link Oath} is to provide an experience similar to a bare {@link Promise} except
 * with expected errors being typed and returned as a value instead of thrown. When
 * {@link run() running} an {@link Oath}, there are three outcomes, each of which can be triggered
 * using callback syntax using `resolve(...)`, `reject(...)` and `chuck(...)` respectively, and
 * triggered using async/await syntax by either returning a value (equivalent to `resolve(...)`) or
 * throwing an error (equivalent to `reject(...)` and `chuck(...)` with the error being
 * automatically sorted).
 *
 * - If the oath completes successfully, the value will be returned in a tuple `[value, OATH_NULL]`.
 * - If the oath completes unsuccessfully due to an expected error, or an expected error is thrown
 *   during execution, the error will be returned in a tuple `[OATH_NULL, error]`.
 * - If the oath completes unsuccessfully due to an unexpected error, or an unexpected error is thrown
 *   during execution, the exception will not be caught and will have to be dealt with by the
 *   calling function.
 *
 * ## Comparison to {@link Promise}
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
 *
 * However there are circumstances where a bare {@link Promise} may be desirable.
 *
 * - If any error returned by a {@link Oath} will be immediately thrown, there is little purpose in
 *   using an {@link Oath} as this behaviour is given as default with a {@link Promise}.
 *
 * ## Potential Pitfalls
 *
 * ### TypeScript Duck-Typing Issues
 *
 * Because of TypeScript's duck-typing, some built-in {@link Error} types are treated as all being
 * equal in TypeScript but not equal in JavaScript. For example, {@link SyntaxError} and
 * {@link TypeError} are both defined as interfaces in TypeScript, leading to the ability to use them
 * interchangeably at the type level.
 *
 * So this is valid TypeScript.
 *
 * ```js
 * const syntaxError: SyntaxError = new TypeError();`
 * ```
 *
 * However in JavaScript you get a different story.
 *
 * ```js
 * assert(syntaxError instanceof SyntaxError); // false
 * ```
 *
 * This can lead to situations where TypeScript does not pick up that a returned value in, for
 * example, {@link mapError} is not the same as the declared expected value.
 *
 * ### Using {@link OATH_NULL} as the success type
 *
 * Executing an {@link Oath} returns an {@link OathResult} with either the first or second item set,
 * corresponding to a value or an error, respectively. Checking for one automatically allows the
 * second to be inferred.
 *
 * ```js
 * const [value, error] = await new Oath<string, Error>(Error, () => {...});
 * if (error !== OATH_NULL) return error;
 * assert(typeof value === "string"); // true
 * ```
 *
 * To allow all regular values to be used as possible value returns, the symbol {@link OATH_NULL} is
 * used to designate a missing value. With regular use, this will not invisible (except for checking
 * a value/error's equality to this special null value), however it is discouraged to use
 * {@link OATH_NULL} as the type for either the value or error as this can cause some potentially
 * unexpected and unpredictable behaviour. Using chained methods (e.g., {@link map()}) on an
 * {@link Oath} with a successful value returned as {@link OATH_NULL} will throw a {@link OathError} as
 * determining whether it was successful or not is impossible.
 *
 * ```js
 * const [value, error] = await new Oath<typeof OATH_NULL, Error>(Error, resolve => resolve(OATH_NULL));
 * if (value === OATH_NULL) {
 *     // this will always be run, even if there is no error and a 'successful' result is hit
 *     // this also means type narrowing for `error` cannot be used
 *     assert(error instanceof Error) // not always true
 * }
 * ```
 *
 * There is currently no effective mechanism in TypeScript to concretely disallow this, so for now,
 * it is syntactically valid but practically dubious.
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
	 * Constructing an {@link Oath} this way is primarily designed for importing a callback-based
	 * asynchronous function (e.g., because of the use of an API such as {@link indexedDB}) that
	 * requires calling `resolve(...)` to return from the function. To instead use the modern
	 * async/await syntax, see {@link Oath.fromAsync()}.
	 *
	 * Instead of two callbacks like a {@link Promise} has with typed `resolve(...)` and untyped
	 * `reject(...)`, an {@link Oath} callback executor has three.
	 *
	 * - `resolve(...)` should be called when returning a successful value result. This is similar to
	 *   {@link Promise Promise's} `resolve(...)`.
	 * - `reject(...)` should be called when an expected error occurs to return the error as a value.
	 *   Note this is different from {@link Promise Promise's} `reject(...)` which is used for any
	 *   errors.
	 * - `chuck(...)` should be called when an unexpected error occurs. This method shares behaviour
	 *   with {@link Promise Promise's} `reject(...)` as it will throw the error.
	 *
	 * Be wary of using the callback syntax with nested {@link Promise Promises} as a `throw` from a
	 * nested {@link Promise} will reject that promise, but not any parent promises. This can be
	 * avoided by ensuring no nested {@link Promise Promises} ever throw an exception, instead
	 * calling the {@link OathChuckFunction} (`chuck(...)`) instead.
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
		return Oath.fromAsync(this.ErrorConstructor, async () => {
			// fetch value, re-throwing errors
			const [value, error] = await this.run();
			if (error !== OATH_NULL) throw error;
			if (value === OATH_NULL) throw OathError.noValueNorError();

			// convert value, returning if not a promise
			const newValue = fn(value);
			if (!(newValue instanceof Oath)) return newValue;

			// await the promise, handling the result
			const [nestedValue, nestedError] = await newValue.run();
			if (nestedError !== OATH_NULL) throw nestedError;
			if (nestedValue !== OATH_NULL) return nestedValue;
			else throw OathError.noValueNorError();
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
		return Oath.fromAsync(error, async () => {
			const [value, oldError] = await this.run();
			if (oldError !== OATH_NULL) throw fn(oldError) ?? oldError;
			else if (value !== OATH_NULL) return value;
			else throw OathError.noValueNorError();
		});
	}

	/**
	 * Execute this {@link Oath}.
	 *
	 * @returns The result of this {@link Oath} - either a successful or error result.
	 */
	async run(): Promise<OathResult<T, E>> {
		return new Promise((resolve, reject) => {
			const resolvers: OathResolvers<T, E> = {
				resolve: data => {
					if (data instanceof Promise) {
						data.then(awaitedData => {
							resolve([awaitedData, OATH_NULL]);
						}).catch(error => {
							if (error instanceof this.ErrorConstructor) resolvers.reject(error);
							else resolvers.chuck(error);
						});
					} else resolve([data, OATH_NULL]);
				},
				reject: error => resolve([OATH_NULL, error]),
				// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
				chuck: error => reject(error)
			};

			try {
				this.oathFn(resolvers);
			} catch (error) {
				if (error instanceof this.ErrorConstructor) resolvers.reject(error);
				else resolvers.chuck(error);
			}
		});
	}

	/**
	 * Import an asynchronous function into an {@link Oath}.
	 *
	 * This method provides an alternative way of constructing an {@link Oath} using the modern
	 * async/await syntax. Instead of calling `resolve(...)` or `reject(...)` as in a regular
	 * {@link Oath}, resolving is done through returning a value from the function, and rejecting is
	 * done through throwing an exception.
	 *
	 * @param error The type of error to treat as an expected error.
	 * @param fn The asynchronous function to run to evaluate the {@link Oath}.
	 * @returns The new {@link Oath}.
	 */
	static fromAsync<T, E extends Error>(error: Constructor<E>, fn: OathFunctionAsync<T>) {
		return new Oath<T, E>(error, ({ resolve, reject, chuck }) => {
			fn()
				.then(data => {
					resolve(data);
				})
				.catch(e => {
					if (e instanceof error) reject(e);
					else chuck(e);
				});
		});
	}

	/**
	 * Execute a {@link fn} as if it were an {@link OathFunction} but synchronously.
	 *
	 * Sometimes, an synchronous function is required however the benefits of {@link Oath} are
	 * desired. In this case, calling {@link sync} may be of use. This method provides no flow
	 * control as that can be done synchronously inside {@link fn}.
	 *
	 * @param error The type of error to treat as an expected error.
	 * @param fn The synchronous function to run to evaluate to an {@link OathResult}.
	 * @returns The evaluated {@link OathResult}.
	 * @throws {unknown} If an unexpected exception was thrown in {@link fn}.
	 */
	static sync<T, E extends Error>(
		error: Constructor<E>,
		fn: OathFunctionSync<T>
	): OathResult<T, E> {
		try {
			return [fn(), OATH_NULL];
		} catch (e) {
			if (e instanceof error) return [OATH_NULL, e];
			else throw e;
		}
	}

	/**
	 * Execute a function, mapping any exceptions thrown.
	 *
	 * The {@link mapFn} is not required to be exhaustive. In cases where it returns a mapped value,
	 * that value will be thrown, else the original error will be re-thrown.
	 *
	 * @param fn The function to execute.
	 * @param mapFn The mapping function to attempt to convert the thrown error.
	 * @returns The value returned by {@link fn} if no exceptions were thrown.
	 * @throws {E} If the error could be successfully mapped.
	 * @throws {unknown} If the error could not be successfully mapped.
	 */
	static mapException<T, E extends Error>(fn: () => T, mapFn: (error: unknown) => E | void) {
		try {
			return fn();
		} catch (error) {
			throw mapFn(error) ?? error;
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
