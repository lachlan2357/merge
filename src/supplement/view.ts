import { ImportedData } from "../index.js";
import { canvas } from "../script.js";
import { Coordinate } from "./index.js";
import { Computed, State } from "./state.js";

// atomics
export const data = new State<ImportedData | undefined>(undefined);
export const canvasDimensions = new State(new Coordinate());
export const mousePos = new State(new Coordinate());
export const mouseDownPos = new State(new Coordinate());
export const mouseOffset = new State(new Coordinate());
export const zoomOffset = new State(new Coordinate());
export const mouseDown = new State(false);
export const mouseMoved = new State(false);
export const zoom = new State(0);

// computed
export const multiplier = new Computed(() => {
	const dataCache = data.get();
	if (!dataCache)
		return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0, multiplier: 0 };

	const allLats: number[] = [];
	const allLons: number[] = [];
	Object.values(dataCache).forEach(way => {
		Object.values(way.nodes).forEach(node => {
			allLats.push(node.lat);
			allLons.push(node.lon);
		});
	});
	const maxLat = Math.max(...allLats);
	const minLat = Math.min(...allLats);
	const maxLon = Math.max(...allLons);
	const minLon = Math.min(...allLons);

	const diffLat = maxLat - minLat;
	const diffLon = maxLon - minLon;
	const minDiff = Math.min(canvas.height / diffLat, canvas.width / diffLon);

	const multiplier = Math.sqrt(minDiff);

	return { minLat, maxLat, minLon, maxLon, multiplier };
}, [data]);

export const totalMultiplier = new Computed(() => {
	return (multiplier.get().multiplier + zoom.get()) ** 2;
}, [multiplier, zoom]);

export const offset = new Computed(() => {
	const totalMultiplierCache = totalMultiplier.get();
	const { minLon, maxLon, minLat, maxLat } = multiplier.get();
	return new Coordinate(
		canvasDimensions.get().x / 2 -
			(minLon + (maxLon - minLon) / 2) * totalMultiplierCache +
			mouseOffset.get().x +
			zoomOffset.get().x,
		canvasDimensions.get().y / 2 +
			(minLat + (maxLat - minLat) / 2) * totalMultiplierCache +
			mouseOffset.get().y +
			zoomOffset.get().y
	);
}, [totalMultiplier, multiplier, canvasDimensions, mouseOffset, zoomOffset]);
