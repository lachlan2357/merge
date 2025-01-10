import { State } from "./state/index.js";

const earthRadius = 6371000;
const earthCircumference = 2 * Math.PI * earthRadius;
const degreesRange = earthCircumference / 2;
const laneWidthMetres = 3.5;

export const laneLength = metresToDegrees(laneWidthMetres);

export function metresToDegrees(metres: number) {
	return (metres / degreesRange) * 180;
}

export function degreesToPixels(degrees: number) {
	return degrees * State.totalMultiplier.get();
}

export function metresToPixels(metres: number) {
	return degreesToPixels(metresToDegrees(metres));
}
