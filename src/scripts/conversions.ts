import { State } from "./state/index.js";

const earthRadius = 6371000;
const earthCircumference = 2 * Math.PI * earthRadius;
const degreesRange = earthCircumference / 2;
const laneWidthMetres = 3.5;

export const laneLength = metresToDegrees(laneWidthMetres);

/**
 * Convert metres into degrees latitude/longitude.
 *
 * @param metres The number of metres.
 * @returns The converted number of degrees.
 */
export function metresToDegrees(metres: number) {
	return (metres / degreesRange) * 180;
}

/**
 * Convert degrees latitude/longitude into on-screen pixels.
 *
 * @param degrees The number of degrees.
 * @returns The converted number of pixels.
 */
export function degreesToPixels(degrees: number) {
	return degrees * State.totalMultiplier.get();
}

/**
 * Convert metres into on-screen pixels.
 *
 * @param metres The number of metres.
 * @returns The converted number of pixels.
 */
export function metresToPixels(metres: number) {
	return degreesToPixels(metresToDegrees(metres));
}
