import { TagError } from "./process.js";

/**
 * Convert an OSM boolean string to a boolean.
 *
 * @param value The OSM string to convert.
 * @returns The converted boolean.
 */
export function toBoolean(value?: string) {
	switch (value) {
		case "yes":
			return true;
		case "no":
			return false;
		case undefined:
			return undefined;
		default:
			throw TagError.invalidTagValue("boolean", value);
	}
}

/**
 * Convert an OSM number string to a number.
 *
 * @param value The OSM string to convert.
 * @param fallback The value to set if {@link value} is `undefined`.
 * @returns The converted number.
 */
export function toNumber(value?: string, fallback?: number) {
	const number = Number(value);
	const isNumber = !isNaN(number);

	if (isNumber) return number;
	if (fallback !== undefined) return fallback;
}

/**
 * Convert an OSM array string to an array.
 *
 * @param value The OSM string to convert.
 * @param delimiter The OSM string delimiter to mark element boundaries.
 * @returns The converted array.
 */
export function toArray(value?: string, delimiter = "|") {
	return value?.split(delimiter).map(value => value || "none");
}

/**
 * Convert an OSM double-array string to a double-array.
 *
 * @example
 * toDoubleArray("left;through|right", ";", "|") === [
 *   ["left", "through"],
 *   ["right"]
 * ]
 *
 * @param array The OSM string to convert.
 * @param innerDelimiter The OSM string delimiter to mark element boundaries for the inner array.
 * @param outerDelimiter The OSM string delimiter to mark element boundaries for the outer arrays.
 * @returns The converted double-array.
 */
export function toDoubleArray(value?: string, innerDelimiter = ";", outerDelimiter = "|") {
	const array = toArray(value, outerDelimiter);
	return array?.map(value => value.split(innerDelimiter).map(value => value || "none"));
}
