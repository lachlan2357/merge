import { State } from "./state.js";

// global values
export const zoomIncrement = 40;

export class Coordinate {
	x: number;
	y: number;

	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	set(x = this.x, y = this.y) {
		this.x = x;
		this.y = y;
	}

	reset() {
		this.x = 0;
		this.y = 0;
	}

	add(value: Coordinate | number) {
		if (typeof value === "number") return new Coordinate(this.x + value, this.y + value);
		else return new Coordinate(this.x + value.x, this.y + value.y);
	}

	subtract(value: Coordinate | number) {
		if (typeof value === "number") return new Coordinate(this.x - value, this.y - value);
		else return new Coordinate(this.x - value.x, this.y - value.y);
	}

	multiply(value: Coordinate | number) {
		if (typeof value === "number") return new Coordinate(this.x * value, this.y * value);
		else return new Coordinate(this.x * value.x, this.y * value.y);
	}

	divide(value: Coordinate | number) {
		if (typeof value === "number") return new Coordinate(this.x / value, this.y / value);
		else return new Coordinate(this.x / value.x, this.y / value.y);
	}

	toScreen() {
		const totalMultiplierCache = State.totalMultiplier.get();
		const offsetCache = State.offset.get();
		return new Coordinate(
			offsetCache.x + this.x * totalMultiplierCache,
			offsetCache.y - this.y * totalMultiplierCache
		);
	}

	toWorld() {
		const totalMultiplierCache = State.totalMultiplier.get();
		const offsetCache = State.offset.get();
		return new Coordinate(
			(this.x - offsetCache.x) / totalMultiplierCache,
			-(this.y - offsetCache.y) / totalMultiplierCache
		);
	}
}

export function nullish(value: unknown): value is null | undefined {
	return value === null || value === undefined;
}

export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(() => resolve(), ms));
}
