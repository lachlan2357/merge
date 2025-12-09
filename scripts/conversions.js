import { State } from "./state/index.js";
/** The radius of the Earth, measured in metres. */ const earthRadius = 6_371_000;
/** The circumference of the Earth, measured in metres. */ const earthCircumference = 2 * Math.PI * earthRadius;
/** The range at which degrees longitude/latitude can be. */ const degreesRange = earthCircumference / 2;
/** Default width of a lane, measured in metres. */ const laneWidthMetres = 3.5;
/** Default width of a lane, measured in degrees. */ export const laneLength = metresToDegrees(laneWidthMetres);
/**
 * Convert metres into degrees latitude/longitude.
 *
 * @param metres The number of metres.
 * @returns The converted number of degrees.
 */ function metresToDegrees(metres) {
    return metres / degreesRange * 180;
}
/**
 * Convert degrees latitude/longitude into on-screen pixels.
 *
 * @param degrees The number of degrees.
 * @returns The converted number of pixels.
 */ function degreesToPixels(degrees) {
    return degrees * State.totalMultiplier.get();
}
/**
 * Convert metres into on-screen pixels.
 *
 * @param metres The number of metres.
 * @returns The converted number of pixels.
 */ export function metresToPixels(metres) {
    return degreesToPixels(metresToDegrees(metres));
}
