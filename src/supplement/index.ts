// global values
export const zoomIncrement = 40;

export class Coordinate {
	x: number;
	y: number;

	constructor(x = 0, y = 0) {
		[this.x, this.y] = [x, y];
	}

	setCoordinates(x?: number, y?: number) {
		this.x = x ?? this.x;
		this.y = y ?? this.y;
	}

	resetCoordinates() {
		[this.x, this.y] = [0, 0];
	}

	add(coord: Coordinate | number) {
		if (typeof coord === "number")
			return new Coordinate(this.x + coord, this.y + coord);
		else return new Coordinate(this.x + coord.x, this.y + coord.y);
	}

	subtract(coord: Coordinate | number) {
		if (typeof coord === "number")
			return new Coordinate(this.x - coord, this.y - coord);
		else return new Coordinate(this.x - coord.x, this.y - coord.y);
	}
	multiply(coord: Coordinate | number) {
		if (typeof coord === "number")
			return new Coordinate(this.x * coord, this.y * coord);
		else return new Coordinate(this.x * coord.x, this.y * coord.y);
	}
	divide(coord: Coordinate | number) {
		if (typeof coord === "number")
			return new Coordinate(this.x / coord, this.y / coord);
		else return new Coordinate(this.x / coord.x, this.y / coord.y);
	}
}

export function nullish(value: unknown): value is null | undefined {
	return value === null || value === undefined;
}
