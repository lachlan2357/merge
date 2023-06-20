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

	reset() {
		[this.x, this.y] = [0, 0];
	}
}
