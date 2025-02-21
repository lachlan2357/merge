import fs from "fs";
import * as process from "child_process";
import { promisify } from "./promise.ts";

/**
 * Remove a file or directory.
 *
 * @param path The path to remove.
 * @param options The removal options.
 * @returns A promise which is resolved when the removal is complete.
 * @see {fs.rm} for implementation.
 */
export async function rm(path: fs.PathLike, options?: fs.RmOptions) {
	return promisify(callback => fs.rm(path, options, callback));
}

type MakeDirectoryOptions = fs.MakeDirectoryOptions & { recursive: true };

/**
 * Create a directory.
 *
 * @param path The path to create as a directory.
 * @param options The creation options.
 * @returns A promise which is resolved when the creation is complete.
 * @see {fs.mkdir} for implementation.
 */
export async function mkdir(path: fs.PathLike, options?: MakeDirectoryOptions) {
	return promisify(callback => fs.mkdir(path, options, callback));
}

type CopyPath = string | URL;

/**
 * Copy a file or directory to another place.
 *
 * @param source The path of the source file/directory.
 * @param destination The path of the destination file/directory.
 * @param opts The copy options.
 * @returns A promise which is resolved when the copy is complete.
 * @see {fs.cp} for implementation.
 */
export async function cp(source: CopyPath, destination: CopyPath, opts: fs.CopyOptions) {
	return promisify(callback => fs.cp(source, destination, opts, callback));
}

/**
 * Execute a command.
 *
 * @param command The command to execute.
 * @returns A promise which is resolved when the command is complete.
 * @see {process.exec} for implementation.
 */
export async function exec(command: string) {
	return promisify(callback => process.exec(command, callback));
}
