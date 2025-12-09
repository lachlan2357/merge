import { AppError } from "./index.ts";
import * as cmd from "./lib/cmd.ts";

/**
 * Build Merge into the `./dist` directory.
 *
 * @throws {AppError} If the build fails.
 */
export async function build() {
	try {
		// delete any previous builds
		await cmd.rm("dist", { recursive: true, force: true });
		await cmd.mkdir("dist", { recursive: true });

		// build project asynchronously
		const promises = [
			cmd.cp("src/pages", "dist", { recursive: true }),
			cmd.cp("assets", "dist", { recursive: true }),
			cmd.exec("yarn swc ./src/scripts -d ./dist --strip-leading-paths"),
			cmd.exec("sass src/styles:dist/styles --no-source-map")
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
