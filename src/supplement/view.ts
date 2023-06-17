import { canvas, data, mouseOffset, zoomOffset } from "../script.js";
import { Coordinate } from "./index.js";

// multiplier variables
export let maxLat: number;
export let minLat: number;
export let maxLon: number;
export let minLon: number;
let multiplier: number;

// zoom
export let zoom = 0;
export const zoomIncrement = 40;

export function setZoom(number: number) {
	zoom = number;
}

export function setMultiplier() {
	// find multiplier
	const allLats: number[] = [];
	const allLons: number[] = [];

	for (const wayId in data) {
		const way = data[wayId];
		for (const nodeId in way.nodes) {
			const node = way.nodes[nodeId];
			allLats.push(node.lat);
			allLons.push(node.lon);
		}
	}

	maxLat = Math.max(...allLats);
	minLat = Math.min(...allLats);
	maxLon = Math.max(...allLons);
	minLon = Math.min(...allLons);

	multiplier = Math.sqrt(
		Math.min(
			...[
				canvas.height / (maxLat - minLat),
				canvas.width / (maxLon - minLon),
			]
		)
	);
}

export function getTotalMultiplier() {
	return (multiplier + zoom) ** 2;
}

export function getOffset(totalMultiplier: number) {
	return new Coordinate(
		canvas.width / 2 -
			(minLon + (maxLon - minLon) / 2) * totalMultiplier +
			mouseOffset.x +
			zoomOffset.x,
		canvas.height / 2 +
			(minLat + (maxLat - minLat) / 2) * totalMultiplier +
			mouseOffset.y +
			zoomOffset.y
	);
}
