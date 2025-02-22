import swc from "@swc/core";
import * as sass from "sass";

/**
 * Transform a SCSS file into CSS.
 *
 * @param path The path to the SCSS file.
 * @param cache The cache to store the transformed CSS file.
 * @returns The transformed CSS file.
 */
export async function scss(path: string, cache: Map<string, string>) {
	// transform file
	const output = await sass.compileAsync(path);
	const code = output.css;

	// update cache and return
	// console.log("setting cache");
	cache.set(path, code);
	// console.log(cache.get(path));
	return code;
}

/**
 * Transform a TypeScript file into JavaScript.
 *
 * @param path The path to the TypeScript file.
 * @param cache The cache to store the transformed JavaScript file.
 * @returns The transformed JavaScript file.
 */
export async function ts(path: string, cache: Map<string, string>) {
	// transform file
	const output = await swc.transformFile(path);
	const code = output.code;

	// update cache and return
	// console.log("setting cache");
	cache.set(path, code);
	// console.log(cache.get(path));
	return code;
}
