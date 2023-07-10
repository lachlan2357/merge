import { Coordinate } from "./supplement.js";
import { offset, totalMultiplier } from "./view.js";

const earthRadius = 6371000;
const earthCircumference = 2 * Math.PI * earthRadius;
const degreesRange = earthCircumference / 2;
const laneWidthMetres = 3.5;

export const laneLength = metresToDegrees(laneWidthMetres);

export function metresToDegrees(metres: number) {
	return (metres / degreesRange) * 180;
}

export function degreesToPixels(degrees: number) {
	return degrees * totalMultiplier.get();
}

export function metresToPixels(metres: number) {
	return degreesToPixels(metresToDegrees(metres));
}

export function coordToScreenSpace(coord: Coordinate) {
	const totalMultiplierCache = totalMultiplier.get();
	const offsetCache = offset.get();
	return new Coordinate(
		offsetCache.x + coord.x * totalMultiplierCache,
		offsetCache.y - coord.y * totalMultiplierCache
	);
}

export function screenSpaceToCoord(coord: Coordinate) {
	const totalMultiplierCache = totalMultiplier.get();
	const offsetCache = offset.get();
	return new Coordinate(
		(coord.x - offsetCache.x) / totalMultiplierCache,
		-(coord.y - offsetCache.y) / totalMultiplierCache
	);
}
