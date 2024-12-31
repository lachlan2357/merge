import { State } from "../state.js";

/**
 * Allow a coordinate to perform math functions with another type of coordinate.
 *
 * Usually, this interface should be used to allow math between the same coordinate type, however
 * it can also be used to perform math across different ones. Generally speaking, implementations
 * should then reference the math functions {@link coordinateAdd()}, {@link coordinateSubtract()},
 * {@link coordinateMultiply()} and {@link coordinateDivide()}
 */
interface CoordinateMath<T extends Coordinate> {
	/**
	 * Add a coordinate or {@link number} to this coordinate.
	 *
	 * In the case where a coordinate is passed, each corresponding dimension will be added. In the
	 * case where a number is passed, each dimension will have that value added to it.
	 *
	 * @param value The value to add to this coordinate.
	 * @returns The resulting coordinate from the addition.
	 */
	add(value: T | number): T;

	/**
	 * Subtract a coordinate or {@link number} from this coordinate.
	 *
	 * In the case where a coordinate is passed, each corresponding dimension will be subtracted.
	 * In the case where a number is passed, each dimension will have that value subtracted from
	 * it.
	 *
	 * @param value The value to subtract from this coordinate.
	 * @returns The resulting coordinate from the subtraction.
	 */
	subtract(value: T | number): T;

	/**
	 * Multiply a coordinate or {@link number} by this coordinate.
	 *
	 * In the case where a coordinate is passed, each corresponding dimension will be multiplied.
	 * In the case where a number is passed, each dimension will be multiplied by it.
	 *
	 * @param value The value to multiply this coordinate by.
	 * @returns The resulting coordinate from the multiplication.
	 */
	multiply(value: T | number): T;

	/**
	 * Divide this coordinate by a coordinate or {@link number}.
	 *
	 * In the case where a coordinate is passed, each corresponding dimension will be divided.
	 * In the case where a number is passed, each dimension will be divided by it.
	 *
	 * @param value The value to divide this coordinate by.
	 * @returns The resulting coordinate from the division.
	 */
	divide(value: T | number): T;
}

/**
 * Signature for passing a {@link Coordinate} constructor as a parameter
 */
type CoordinateConstructor<T extends Coordinate> = new (x: number, y: number) => T;

/**
 * Generic implementation of adding two {@link Coordinate Coordinates} together.
 *
 * In a perfect world, this method would instead be implemented as operator overloading. However,
 * since JavaScript does not support such a feature, it is a function instead. Thus, calling
 * `coordinateAdd(coord1, coord2, Coordinate);` does what should be `coord1 + coord;`.
 *
 * Also in a perfect world, this method would form the default implementation of
 * {@link CoordinateMath.add()} however since interfaces are not real in JavaScript, they cannot
 * perform any logic and thus cannot have default implementations.
 *
 * @param lhs The coordinate on the left-hand side of the addition.
 * @param rhs The coordinate, or value, on the right-hand size of the addition.
 * @param constructor The type of {@link Coordinate} to construct the result as.
 * @returns The resulting coordinate after performing the addition.
 */
function coordinateAdd<T extends Coordinate>(
	lhs: T,
	rhs: T | number,
	constructor: CoordinateConstructor<T>
): T {
	if (typeof rhs === "number") return new constructor(lhs.x + rhs, lhs.y + rhs);
	else return new constructor(lhs.x + rhs.x, lhs.y + rhs.y);
}

/**
 * Generic implementation of subtracting a {@link Coordinate} from another.
 *
 * In a perfect world, this method would instead be implemented as operator overloading. However,
 * since JavaScript does not support such a feature, it is a function instead. Thus, calling
 * `coordinateSubtract(coord1, coord2, Coordinate);` does what should be `coord1 - coord;`.
 *
 * Also in a perfect world, this method would form the default implementation of
 * {@link CoordinateMath.subtract()} however since interfaces are not real in JavaScript, they
 * cannot perform any logic and thus cannot have default implementations.
 *
 * @param lhs The coordinate on the left-hand side of the subtraction.
 * @param rhs The coordinate, or value, on the right-hand size of the subtraction.
 * @param constructor The type of {@link Coordinate} to construct the result as.
 * @returns The resulting coordinate after performing the subtraction.
 */
function coordinateSubtract<T extends Coordinate>(
	lhs: T,
	rhs: T | number,
	constructor: CoordinateConstructor<T>
) {
	if (typeof rhs === "number") return new constructor(lhs.x - rhs, lhs.y - rhs);
	else return new constructor(lhs.x - rhs.x, lhs.y - rhs.y);
}

/**
 * Generic implementation of multiplying two {@link Coordinate Coordinates} together.
 *
 * In a perfect world, this methods would instead be implemented as operator overloading. However,
 * since JavaScript does not support such a feature, it is a function instead. Thus, calling
 * `coordinateMultiply(coord1, coord2, Coordinate);` does what should be `coord1 * coord;`.
 *
 * Also in a perfect world, this method would form the default implementation of
 * {@link CoordinateMath.multiply()} however since interfaces are not real in JavaScript, they
 * cannot perform any logic and thus cannot have default implementations.
 *
 * @param lhs The coordinate on the left-hand side of the multiplication.
 * @param rhs The coordinate, or value, on the right-hand size of the multiplication.
 * @param constructor The type of {@link Coordinate} to construct the result as.
 * @returns The resulting coordinate after performing the multiplication.
 */
function coordinateMultiply<T extends Coordinate>(
	lhs: T,
	rhs: T | number,
	constructor: CoordinateConstructor<T>
) {
	if (typeof rhs === "number") return new constructor(lhs.x * rhs, lhs.y * rhs);
	else return new constructor(lhs.x * rhs.x, lhs.y * rhs.y);
}

/**
 * Generic implementation of dividing a {@link Coordinate} by another.
 *
 * In a perfect world, this methods would instead be implemented as operator overloading. However,
 * since JavaScript does not support such a feature, it is a function instead. Thus, calling
 * `coordinateDivide(coord1, coord2, Coordinate);` does what should be `coord1 / coord;`.
 *
 * Also in a perfect world, this method would form the default implementation of
 * {@link CoordinateMath.divide()} however since interfaces are not real in JavaScript, they
 * cannot perform any logic and thus cannot have default implementations.
 *
 * @param lhs The coordinate on the left-hand side of the division.
 * @param rhs The coordinate, or value, on the right-hand size of the division.
 * @param constructor The type of {@link Coordinate} to construct the result as.
 * @returns The resulting coordinate after performing the division.
 */
function coordinateDivide<T extends Coordinate>(
	lhs: T,
	rhs: T | number,
	constructor: CoordinateConstructor<T>
) {
	if (typeof rhs === "number") return new constructor(lhs.x / rhs, lhs.y / rhs);
	else return new constructor(lhs.x / rhs.x, lhs.y / rhs.y);
}

/**
 * Base Coordinate class for representing a two-dimensional point.
 *
 * This base class should not be used by a consumer as it does not provide the context required to
 * properly use it. Instead, it is required to use either {@link ScreenCoordinate} if the
 * coordinate is measured in screen-space (pixels) or {@link WorldCoordinate} if the coordinate is
 * measured in world-space (degrees latitude/longitude).
 */
class Coordinate {
	/**
	 * The x-position of this coordinate.
	 */
	x: number;

	/**
	 * The y-position of this coordinate.
	 */
	y: number;

	/**
	 * Create a new coordinate at a certain location.
	 *
	 * Omitting either {@link x} or {@link y} components of this constructor will result in the
	 * value of that dimension being set to 0.
	 *
	 * @param x The initial x-position of this coordinate.
	 * @param y The initial y-position of this coordinate.
	 */
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	/**
	 * Retrieve a tuple with the x- and y-position of this coordinate.
	 *
	 * This method is designed to be used with methods that require both dimensions to be passed as
	 * different parameters, such as {@link CanvasRenderingContext2D.moveTo()}, thus can be used
	 * like `context.moveTo(...coordinate.get());
	 *
	 * @returns A tuple of [x, y] positions.
	 */
	get(): [number, number] {
		return [this.x, this.y];
	}
}

/**
 * A coordinate with its dimensions in terms of the screen-space.
 *
 * For a container meant to store world-space coordinate (latitude and longitude), it is necessary
 * to use {@link WorldCoordinate}.
 */
export class ScreenCoordinate extends Coordinate implements CoordinateMath<ScreenCoordinate> {
	add(value: number | ScreenCoordinate): ScreenCoordinate {
		return coordinateAdd(this, value, ScreenCoordinate);
	}

	subtract(value: number | ScreenCoordinate): ScreenCoordinate {
		return coordinateSubtract(this, value, ScreenCoordinate);
	}

	multiply(value: number | ScreenCoordinate): ScreenCoordinate {
		return coordinateMultiply(this, value, ScreenCoordinate);
	}

	divide(value: number | ScreenCoordinate): ScreenCoordinate {
		return coordinateDivide(this, value, ScreenCoordinate);
	}

	/**
	 * Convert this {@link ScreenCoordinate} to a {@link WorldCoordinate}.
	 *
	 * This conversion depends on the current state of the map, thus is only valid while the map
	 * hasn't changed.
	 *
	 * @returns The converted {@link WorldCoordinate}.
	 */
	toWorld() {
		const totalMultiplierCache = State.totalMultiplier.get();
		const offsetCache = State.offset.get();

		return new WorldCoordinate(
			(this.x - offsetCache.x) / totalMultiplierCache,
			-(this.y - offsetCache.y) / totalMultiplierCache
		);
	}
}

export class WorldCoordinate extends Coordinate implements CoordinateMath<WorldCoordinate> {
	add(value: number | WorldCoordinate): WorldCoordinate {
		return coordinateAdd(this, value, WorldCoordinate);
	}

	subtract(value: number | WorldCoordinate): WorldCoordinate {
		return coordinateSubtract(this, value, WorldCoordinate);
	}

	multiply(value: number | WorldCoordinate): WorldCoordinate {
		return coordinateMultiply(this, value, WorldCoordinate);
	}

	divide(value: number | WorldCoordinate): WorldCoordinate {
		return coordinateDivide(this, value, WorldCoordinate);
	}

	/**
	 * Convert this {@link WorldCoordinate} to a {@link ScreenCoordinate}.
	 *
	 * This conversion depends on the current state of the map, thus is only valid while the map
	 * hasn't changed.
	 *
	 * @returns The converted {@link ScreenCoordinate}.
	 */
	toScreen() {
		const totalMultiplierCache = State.totalMultiplier.get();
		const offsetCache = State.offset.get();

		return new ScreenCoordinate(
			offsetCache.x + this.x * totalMultiplierCache,
			offsetCache.y - this.y * totalMultiplierCache
		);
	}
}
