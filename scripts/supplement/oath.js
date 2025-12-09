/**
 * Symbol to designate that either the value or error returned from an {@link Oath} is null.
 *
 * The signature of an {@link Oath} result is one of two states: a tuple where either the first or
 * second value is {@link OATH_NULL}. This allows clients of {@link OathResult} to determine which
 * state is returned by evaluating which of the tuple values are {@link OATH_NULL}.
 *
 * A {@link Symbol} has been used for this purpose to eliminate potential conflicts with desired
 * value or error types. For example, if `null` was used instead, it would cause successful
 * execution of an {@link OathResult} with a return type of `T | null` to possibly return the tuple
 * `[null, null]`, rendering it impossible to determine whether the {@link Oath} has resolved a value
 * or an error. Using a symbol mitigates this issue, however it should be noted that while it
 * remains possible to define an {@link OathResult} with a return type of `typeof OATH_NULL`, this is
 * strongly discouraged as it results in the same indeterminate {@link OathResult} and not allow
 * TypeScript to restrict the value or error.
 */ export const OATH_NULL = Symbol("Representing an empty returned value/error in an OathResult.");
/**
 * Alternative to a bare {@link Promise} for handling asynchronous functions.
 *
 * ## Premise
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
 * ## Advantages to {@link Promise}
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
 * ## Disadvantages to {@link Promise}
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
 * {@link TypeError} are both defined as empty interfaces extending {@link Error} in TypeScript,
 * leading to the ability to use them interchangeably at the type level.
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
 * example, {@link mapError()} is not the same as the declared expected value.
 *
 * ### Using {@link OATH_NULL} as the success type
 *
 * {@link OATH_NULL} should never be used as the success type {@link T} of an {@link Oath}. See
 * {@link OATH_NULL} for more information.
 *
 * @template T The success type of the {@link Oath}.
 * @template E The expected error type of the {@link Oath}.
 */ export class Oath {
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
	 *
	 * @see {@link OathFunction} for more information.
	 */ oathFn;
    /**
	 * The constructor that errors will be tested against to determine whether they are expected.
	 *
	 * An expected error will be returned as a value instead of being thrown. See {@link Oath} for
	 * details.
	 */ ErrorConstructor;
    /**
	 * Create a new {@link Oath}.
	 *
	 * Constructing an {@link Oath} this way is primarily designed for importing a callback-based
	 * asynchronous function (e.g., because of the use of an API such as {@link indexedDB}) that
	 * requires calling `resolve(...)` to return from the function. To instead use the modern
	 * async/await syntax, see {@link Oath.fromAsync()}.
	 *
	 * Be wary of using the callback syntax with nested {@link Promise Promises} as a `throw` from a
	 * nested {@link Promise} will reject that promise, but not any parent promises. This can be
	 * avoided by ensuring no nested {@link Promise Promises} ever throw an exception, instead
	 * calling the {@link OathChuckFunction} (`chuck(...)`) instead.
	 *
	 * @param error The type of error to treat as an expected error.
	 * @param fn The function to run to evaluate the {@link Oath}.
	 * @see {@link OathFunction} for how this function should be defined.
	 */ constructor(error, fn){
        this.oathFn = fn;
        this.ErrorConstructor = error;
    }
    /**
	 * Map a successful result from this {@link Oath} to another value.
	 *
	 * Provided this {@link Oath} returns a successful value, the provided {@link fn} will be run on
	 * the result of this {@link Oath}.
	 *
	 * @template U The type to map the successful value of this {@link Oath} to.
	 * @param fn The function to run on a successful result from this {@link Oath}.
	 * @returns A new {@link Oath} with the successful result mapped.
	 */ map(fn) {
        return Oath.fromAsync(this.ErrorConstructor, async ()=>{
            // fetch value, re-throwing errors
            const [value, error] = await this.run();
            if (error !== OATH_NULL) throw error;
            if (value === OATH_NULL) throw OathError.noValueNorError();
            // convert value, returning if new value is not an oath
            const newValue = fn(value);
            if (!(newValue instanceof Oath)) return newValue;
            // run the oath, handling the result
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
	 * @template F The type to map the expected error of this {@link Oath} to.
	 * @param error The error type to map the error result to.
	 * @param fn The function to determine how to map the error.
	 * @returns A new {@link Oath} with the error result mapped.
	 */ mapError(error, fn) {
        return Oath.fromAsync(error, async ()=>{
            const [value, oldError] = await this.run();
            if (oldError !== OATH_NULL) throw fn(oldError) ?? oldError;
            else if (value !== OATH_NULL) return value;
            else throw OathError.noValueNorError();
        });
    }
    /**
	 * Execute this {@link Oath}.
	 *
	 * To execute this {@link Oath}, it is converted to a {@link Promise} and run, with the
	 * {@link OathResolvers} being mapped to {@link Promise} resolvers. Thus, the returned value of
	 * this method must be awaited before use.
	 *
	 * @returns The result of this {@link Oath} - either a successful or error result.
	 * @throws {unknown} If an unexpected error occurs.
	 */ async run() {
        return new Promise((resolve, reject)=>{
            const resolvers = {
                resolve: (data)=>{
                    if (data instanceof Promise) {
                        data.then((awaitedData)=>{
                            resolve([
                                awaitedData,
                                OATH_NULL
                            ]);
                        }).catch((error)=>{
                            if (error instanceof this.ErrorConstructor) resolvers.reject(error);
                            else resolvers.chuck(error);
                        });
                    } else resolve([
                        data,
                        OATH_NULL
                    ]);
                },
                reject: (error)=>resolve([
                        OATH_NULL,
                        error
                    ]),
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                chuck: (error)=>reject(error)
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
	 * Execute this {@link Oath}, throwing any error instead of returning it.
	 *
	 * This method translates an {@link Oath} back to {@link Promise}-like behaviour. This should be
	 * used in cases where exceptions are to be bubbled.
	 *
	 * @returns The successful value of the {@link Oath}.
	 * @throws {E} If an expected error occurs.
	 * @throws {OathError} If both value and error are {@link OATH_NULL}.
	 * @throws {unknown} If an unexpected error occurs.
	 */ async runAndThrow() {
        const [value, error] = await this.run();
        if (error !== OATH_NULL) throw error;
        if (value !== OATH_NULL) return value;
        else throw OathError.noValueNorError();
    }
    /**
	 * Import an asynchronous function into an {@link Oath}.
	 *
	 * This method provides an alternative way of constructing an {@link Oath} using the modern
	 * async/await syntax. Instead of calling `resolve(...)`, `reject(...)` or `chuck(...)` as in a
	 * regular {@link Oath}, resolving is done through returning a value from the function, and both
	 * rejecting and chucking is done through throwing an exception, with the error to be classed as
	 * 'expected' or 'unexpected' based on its prototype.
	 *
	 * @template T The success type of the {@link Oath}.
	 * @template E The expected error type of the {@link Oath}.
	 * @param error The type of error to treat as an expected error.
	 * @param fn The asynchronous function to run to evaluate the {@link Oath}.
	 * @returns The new {@link Oath}.
	 */ static fromAsync(error, fn) {
        return new Oath(error, ({ resolve, reject, chuck })=>{
            fn().then((data)=>{
                resolve(data);
            }).catch((e)=>{
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
	 * control as that can be done synchronously inside {@link fn}, so returning a successful value
	 * is done by returning a value from the function, and both 'expected' and 'unexpected' errors
	 * are done by throwing them, with them being classed based on its prototype.
	 *
	 * @template T The success type of the {@link Oath}.
	 * @template E The expected error type of the {@link Oath}.
	 * @param error The type of error to treat as an expected error.
	 * @param fn The synchronous function to run to evaluate to an {@link OathResult}.
	 * @returns The evaluated {@link OathResult}.
	 * @throws {unknown} If an unexpected exception was thrown in {@link fn}.
	 */ static sync(error, fn) {
        try {
            return [
                fn(),
                OATH_NULL
            ];
        } catch (e) {
            if (e instanceof error) return [
                OATH_NULL,
                e
            ];
            else throw e;
        }
    }
    /**
	 * Execute a function, mapping any exceptions thrown.
	 *
	 * The {@link mapFn} is not required to be exhaustive. In cases where it returns a mapped value,
	 * that value will be thrown, else the original error will be re-thrown.
	 *
	 * @template T The success type of the {@link Oath}.
	 * @template E The expected error type of the {@link Oath}.
	 * @param fn The function to execute.
	 * @param mapFn The mapping function to attempt to convert the thrown error.
	 * @returns The value returned by {@link fn} if no exceptions were thrown.
	 * @throws {E} If the error could be successfully mapped.
	 * @throws {unknown} If the error could not be successfully mapped.
	 */ static mapException(fn, mapFn) {
        try {
            return fn();
        } catch (error) {
            throw mapFn(error) ?? error;
        }
    }
}
/** Errors which could occur during usage of an {@link Oath}. */ class OathError extends Error {
    /**
	 * Error for when an {@link Oath} returns neither a successful or error result.
	 *
	 * This type of error usually indicates an issue with a provided {@link OathFunction}, possibly
	 * returning {@link OATH_NULL} as a valid successful value. See {@link OATH_NULL} for why this is
	 * problematic.
	 *
	 * @returns The constructed error.
	 */ static noValueNorError() {
        return new OathError("Oath returned neither a value nor an error.");
    }
}
