import { AppError } from "./index.ts";
import { exec } from "child_process";
import { cp, mkdir, rm, type NoParamCallback } from "fs";

/**
 * Build Merge into the `dist` directory.
 *
 * @throws {AppError} If the build fails.
 */
export default async function () {
	try {
		// delete any previous builds
		await promisify(callback => rm("dist", { recursive: true, force: true }, callback));
		await promisify(callback => mkdir("dist", { recursive: true }, callback));

		// build project asynchronously
		const promises = [
			promisify(callback => cp("src/pages", "dist", { recursive: true }, callback)),
			promisify(callback => cp("assets", "dist", { recursive: true }, callback)),
			promisify(callback => exec("tsc", callback)),
			promisify(callback => exec("sass src/styles:dist/styles --no-source-map", callback))
		];
		await Promise.all(promises);
	} catch (error) {
		if (error instanceof Error) {
			throw new AppError(`Could not build Merge: ${error.message}`);
		} else {
			throw error;
		}
	}
}

/** Type of the resolvers returned by {@link Promise.withResolvers()} excluding the {@link Promise}. */
type Resolvers<T> = Omit<PromiseWithResolvers<T>, "promise">;
type Callback = (error: Error | null) => void;

/**
 * Convert a NodeJS async-callback operation to a {@link Promise}.
 *
 * @param fn The function containing the async-callback operator.
 * @returns The {@link fn} Converted into a {@link Promise}.
 */
function promisify(fn: (callback: Callback) => void) {
	const { promise, resolve, reject } = Promise.withResolvers<void>();
	const callback = (error: Error) => {
		if (error === null) resolve();
		else reject(error);
	};

	fn(callback);
	return promise;
}
