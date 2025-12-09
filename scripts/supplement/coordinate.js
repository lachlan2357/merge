import { State } from "../state/index.js";
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
 */ function coordinateAdd(lhs, rhs, constructor) {
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
 * {@link CoordinateMath.subtract()} however since interfaces are not real in JavaScript, they cannot
 * perform any logic and thus cannot have default implementations.
 *
 * @param lhs The coordinate on the left-hand side of the subtraction.
 * @param rhs The coordinate, or value, on the right-hand size of the subtraction.
 * @param constructor The type of {@link Coordinate} to construct the result as.
 * @returns The resulting coordinate after performing the subtraction.
 */ function coordinateSubtract(lhs, rhs, constructor) {
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
 * {@link CoordinateMath.multiply()} however since interfaces are not real in JavaScript, they cannot
 * perform any logic and thus cannot have default implementations.
 *
 * @param lhs The coordinate on the left-hand side of the multiplication.
 * @param rhs The coordinate, or value, on the right-hand size of the multiplication.
 * @param constructor The type of {@link Coordinate} to construct the result as.
 * @returns The resulting coordinate after performing the multiplication.
 */ function coordinateMultiply(lhs, rhs, constructor) {
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
 * {@link CoordinateMath.divide()} however since interfaces are not real in JavaScript, they cannot
 * perform any logic and thus cannot have default implementations.
 *
 * @param lhs The coordinate on the left-hand side of the division.
 * @param rhs The coordinate, or value, on the right-hand size of the division.
 * @param constructor The type of {@link Coordinate} to construct the result as.
 * @returns The resulting coordinate after performing the division.
 */ function coordinateDivide(lhs, rhs, constructor) {
    if (typeof rhs === "number") return new constructor(lhs.x / rhs, lhs.y / rhs);
    else return new constructor(lhs.x / rhs.x, lhs.y / rhs.y);
}
/**
 * Base Coordinate class for representing a two-dimensional point.
 *
 * This base class should not be used by a consumer as it does not provide the context required to
 * properly use it. Instead, it is required to use either {@link ScreenCoordinate} if the coordinate
 * is measured in screen-space (pixels) or {@link WorldCoordinate} if the coordinate is measured in
 * world-space (degrees latitude/longitude).
 */ class Coordinate {
    /** The x-position of this coordinate. */ x;
    /** The y-position of this coordinate. */ y;
    /**
	 * Create a new coordinate at a certain location.
	 *
	 * Omitting either {@link x} or {@link y} components of this constructor will result in the value
	 * of that dimension being set to 0.
	 *
	 * @param x The initial x-position of this coordinate.
	 * @param y The initial y-position of this coordinate.
	 */ constructor(x = 0, y = 0){
        this.x = x;
        this.y = y;
    }
    /**
	 * Retrieve a tuple with the x- and y-position of this coordinate.
	 *
	 * This method is designed to be used with methods that require both dimensions to be passed as
	 * different parameters, such as {@link CanvasRenderingContext2D.moveTo()}, thus can be used like
	 * `context.moveTo(...coordinate.get());`.
	 *
	 * @returns A tuple of [x, y] positions.
	 */ get() {
        return [
            this.x,
            this.y
        ];
    }
}
/**
 * A coordinate with its dimensions in terms of the screen-space.
 *
 * For a container meant to store world-space coordinate (latitude and longitude), it is necessary
 * to use {@link WorldCoordinate}.
 */ export class ScreenCoordinate extends Coordinate {
    add(value) {
        return coordinateAdd(this, value, ScreenCoordinate);
    }
    subtract(value) {
        return coordinateSubtract(this, value, ScreenCoordinate);
    }
    multiply(value) {
        return coordinateMultiply(this, value, ScreenCoordinate);
    }
    divide(value) {
        return coordinateDivide(this, value, ScreenCoordinate);
    }
    /**
	 * Convert this {@link ScreenCoordinate} to a {@link WorldCoordinate}.
	 *
	 * This conversion depends on the current state of the map, thus is only valid while the map
	 * hasn't changed.
	 *
	 * @returns The converted {@link WorldCoordinate}.
	 */ toWorld() {
        const totalMultiplierCache = State.totalMultiplier.get();
        const offsetCache = State.offset.get();
        return new WorldCoordinate((this.x - offsetCache.x) / totalMultiplierCache, -(this.y - offsetCache.y) / totalMultiplierCache);
    }
    /**
	 * Import the location of the mouse from a {@link MouseEvent} into a {@link ScreenCoordinate}.
	 *
	 * @param event The {@link MouseEvent} to import from.
	 * @returns The {@link ScreenCoordinate}.
	 */ static fromMouseEvent(event) {
        return new ScreenCoordinate(event.clientX, event.clientY);
    }
    /**
	 * Import the dimensions of an {@link Element} into a {@link ScreenCoordinate}.
	 *
	 * @param element The {@link Element} to import from.
	 * @returns The {@link ScreenCoordinate}.
	 */ static ofElementDimensions(element) {
        return new ScreenCoordinate(element.clientWidth, element.clientHeight);
    }
    /**
	 * Import the offset of an {@link Element} into a {@link ScreenCoordinate}.
	 *
	 * @param element The {@link Element} to import from.
	 * @returns The {@link ScreenCoordinate}.
	 */ static ofElementOffset(element) {
        return new ScreenCoordinate(element.offsetLeft, element.offsetTop);
    }
}
export class WorldCoordinate extends Coordinate {
    add(value) {
        return coordinateAdd(this, value, WorldCoordinate);
    }
    subtract(value) {
        return coordinateSubtract(this, value, WorldCoordinate);
    }
    multiply(value) {
        return coordinateMultiply(this, value, WorldCoordinate);
    }
    divide(value) {
        return coordinateDivide(this, value, WorldCoordinate);
    }
    /**
	 * Convert this {@link WorldCoordinate} to a {@link ScreenCoordinate}.
	 *
	 * This conversion depends on the current state of the map, thus is only valid while the map
	 * hasn't changed.
	 *
	 * @returns The converted {@link ScreenCoordinate}.
	 */ toScreen() {
        const totalMultiplierCache = State.totalMultiplier.get();
        const offsetCache = State.offset.get();
        return new ScreenCoordinate(offsetCache.x + this.x * totalMultiplierCache, offsetCache.y - this.y * totalMultiplierCache);
    }
    /**
	 * Import the longitude/latitude of an {@link OverpassNode} into a {@link WorldCoordinate}.
	 *
	 * @param node The {@link OverpassNode} to import from.
	 * @returns The {@link WorldCoordinate}.
	 */ static fromOverpassNode(node) {
        return new WorldCoordinate(node.lon, node.lat);
    }
}
