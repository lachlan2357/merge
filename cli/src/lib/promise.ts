import type { promisify as nodePromisify } from "util";

/**
 * Type of a valid callback function to convert to a {@link Promise}.
 *
 * A successful execution callback is designated by {@link error} being passed `null`, where an
 * unsuccessful callback is designated by {@link error} being passed any {@link Error}. This is what
 * will determine whether the {@link Promise} resolves or rejects.
 *
 * @param error The error that arose, if one did.
 */
type Callback = (error: Error | null) => void;

/**
 * Convert a NodeJS async-callback operation to a {@link Promise}.
 *
 * This method is similar in concept to the {@link nodePromisify promisify} method provided by
 * NodeJS, however adapted to be more generic.
 *
 * @param fn The function containing the async-callback operator.
 * @returns The {@link fn} Converted into a {@link Promise}.
 */
export function promisify(fn: (callback: Callback) => void) {
	const { promise, resolve, reject } = Promise.withResolvers<void>();
	const callback = (error: Error) => {
		if (error === null) resolve();
		else reject(error);
	};

	fn(callback);
	return promise;
}
