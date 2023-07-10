import { drawCanvas } from "./canvas.js";
import { Atomic, Computed, Effect } from "./state.js";
import { Coordinate } from "./supplement.js";
import { ImportedData, OverpassWay } from "./types.js";

// atomics
export const data = new Atomic<ImportedData | undefined>(undefined);
export const currentRelationId = new Atomic<number | undefined>(undefined);
export const drawnElements = new Atomic<{
	[key: number]: {
		wayId: number;
		path: Path2D;
	};
}>({});
export const selectedWay = new Atomic(-1);
export const allWays = new Atomic<Map<number, OverpassWay>>(new Map());
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

	const allLats = new Array<number>();
	const allLons = new Array<number>();
	dataCache.forEach(way => {
		way.nodes.forEach(({ lat, lon }) => {
			allLats.push(lat);
			allLons.push(lon);
		});
	});

	maxLat = Math.max(...allLats);
	minLat = Math.min(...allLats);
	maxLon = Math.max(...allLons);
	minLon = Math.min(...allLons);

	const diff = new Coordinate(maxLon - minLon, maxLat - minLat);
	const diffScale = canvasCache.divide(diff);
	const minDiff = Math.min(diffScale.x, diffScale.y);

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
	zoom
]);

new Effect(
	() => (window.location.hash = `#${currentRelationId.get()}`),
	[currentRelationId]
);
