import { Coordinate } from "./index.js";
import { getTotalMultiplier, getOffset } from "./view.js";

const earthRadius = 6371000;
const earthCircumference = 2 * Math.PI * earthRadius;
const degreesRange = earthCircumference / 2;

export function metresToDegrees(metres: number) {
	return (metres / degreesRange) * 180;
}

export function degreesToPixels(degrees: number) {
	return degrees * getTotalMultiplier();
}

export function coordToScreenSpace(coord: Coordinate) {
	// set zoom and offset
	const totalMultiplier = getTotalMultiplier();
	const offset = getOffset(totalMultiplier);

	// return screen space coordinate
	return new Coordinate(
		offset.x + coord.x * totalMultiplier,
		offset.y - coord.y * totalMultiplier
	);
}
