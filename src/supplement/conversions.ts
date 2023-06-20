import { Coordinate } from "./index.js";
import { offset, totalMultiplier } from "./view.js";

const earthRadius = 6371000;
const earthCircumference = 2 * Math.PI * earthRadius;
const degreesRange = earthCircumference / 2;

export function metresToDegrees(metres: number) {
	return (metres / degreesRange) * 180;
}

export function degreesToPixels(degrees: number) {
	return degrees * totalMultiplier.get();
}

export function coordToScreenSpace(coord: Coordinate) {
	// set zoom and offset
	const totalMultiplierCache = totalMultiplier.get();
	const offsetCache = offset.get();

	// return screen space coordinate
	return new Coordinate(
		offsetCache.x + coord.x * totalMultiplierCache,
		offsetCache.y - coord.y * totalMultiplierCache
	);
}
