import { ImportedData, OverpassWay } from "../index.js";
import { drawCanvas } from "../script.js";
import { Coordinate } from "./index.js";
import { Computed, Atomic, Effect } from "./state.js";

// atomics
export const data = new Atomic<ImportedData | undefined>(undefined);
export const currentRelationId = new Atomic<number | undefined>(undefined);
export const drawnElements = new Atomic<{
	[key: number]: {
		wayId: string;
		path: Path2D;
	};
}>({});
export const selectedWay = new Atomic(-1);
export const allWays = new Atomic<Record<number, OverpassWay>>({});
export const canvasDimensions = new Atomic(new Coordinate());
export const canvasOffset = new Atomic(new Coordinate());
export const mousePos = new Atomic(new Coordinate());
export const mouseDownPos = new Atomic(new Coordinate());
export const mouseOffset = new Atomic(new Coordinate());
export const zoomOffset = new Atomic(new Coordinate());
export const mouseDown = new Atomic(false);
export const mouseMoved = new Atomic(false);
export const zoom = new Atomic(0);

// computed
export const multiplier = new Computed(() => {
	let maxLat = 0,
		minLat = 0,
		maxLon = 0,
		minLon = 0,
		multiplier = 0;

	const dataCache = data.get();
	const canvasCache = canvasDimensions.get();
	if (!dataCache) return { minLat, maxLat, minLon, maxLon, multiplier };

	const allLats: number[] = [];
	const allLons: number[] = [];
	Object.values(dataCache).forEach(way => {
		Object.values(way.nodes).forEach(node => {
			allLats.push(node.lat);
			allLons.push(node.lon);
		});
	});

	maxLat = Math.max(...allLats);
	minLat = Math.min(...allLats);
	maxLon = Math.max(...allLons);
	minLon = Math.min(...allLons);

	const diffLat = maxLat - minLat;
	const diffLon = maxLon - minLon;
	const minDiff = Math.min(canvasCache.x / diffLat, canvasCache.y / diffLon);

	multiplier = Math.sqrt(minDiff);

	return { minLat, maxLat, minLon, maxLon, multiplier };
}, [data, canvasDimensions]);

export const totalMultiplier = new Computed(() => {
	return (multiplier.get().multiplier + zoom.get()) ** 2;
}, [multiplier, zoom]);

export const offset = new Computed(() => {
	const totalMultiplierCache = totalMultiplier.get();
	const { minLon, maxLon, minLat, maxLat } = multiplier.get();
	const canvasCache = canvasDimensions.get();

	return new Coordinate(
		canvasCache.x / 2 -
			(minLon + (maxLon - minLon) / 2) * totalMultiplierCache +
			mouseOffset.get().x +
			zoomOffset.get().x,
		canvasCache.y / 2 +
			(minLat + (maxLat - minLat) / 2) * totalMultiplierCache +
			mouseOffset.get().y +
			zoomOffset.get().y
	);
}, [totalMultiplier, multiplier, canvasDimensions, mouseOffset, zoomOffset]);

// effects
new Effect(drawCanvas, [
	data,
	canvasDimensions,
	mousePos,
	mouseDownPos,
	mouseOffset,
	zoomOffset,
	mouseDown,
	mouseMoved,
	zoom,
]);

new Effect(
	() => (window.location.hash = `#${currentRelationId.get()}`),
	[currentRelationId]
);
