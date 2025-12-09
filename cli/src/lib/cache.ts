import { toCanonicalPath } from "./paths.ts";

/**
 * Map to store cached files in.
 *
 * The only difference between this map and a {@link Map<string, string>} is that this map
 * automatically converts all key parameters to a canonical path using {@link toCanonicalPath} before
 * use.
 */
export class CacheMap extends Map<string, string> {
	override delete(key: string): boolean {
		const path = toCanonicalPath(key);
		return super.delete(path);
	}

	override get(key: string): string {
		const path = toCanonicalPath(key);
		return super.get(path);
	}

	override has(key: string): boolean {
		const path = toCanonicalPath(key);
		return super.has(path);
	}

	override set(key: string, value: string): this {
		const path = toCanonicalPath(key);
		return super.set(path, value);
	}
}
