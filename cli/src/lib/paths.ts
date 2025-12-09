const REQUEST_PATH = /^\/merge\/([^/]+)\/([^.]+)\.(.+)$/;

const DIRECTORY_EXTENSION_MAP: Record<string, string> = {
	scripts: "ts",
	styles: "scss"
};

/**
 * Transform a requested file path to a relative path.
 *
 * @param requestPath The path that was requested by a server client.
 * @returns The transformed path.
 */
export function requestPathToFilePath(requestPath: string) {
	const match = REQUEST_PATH.exec(requestPath);
	if (match === null) return null;

	const directory = match[1];
	const path = match[2];
	const extension = match[3];
	const newExtension = DIRECTORY_EXTENSION_MAP[directory];
	if (newExtension === undefined) return `${path}.${extension}`;
	else return `${path}.${newExtension}`;
}

/**
 * Convert a {@link path} into a standard format.
 *
 * @param path The path to converted.
 * @returns The standard format path.
 * @throws {Error} If {@link path} is an invalid path.
 */
export function toCanonicalPath(path: string) {
	// strip any path prefix identifiers before `src`
	let newPath = path;
	while (!newPath.startsWith("src") && newPath.length > 0) newPath = newPath.slice(1);
	if (newPath.length === 0) throw new Error(`Invalid path: ${path}`);

	// convert all slashes to forward slashes
	newPath = newPath.replaceAll("\\", "/");
	return newPath;
}
