import { State } from "./state.js";
const earthRadius = 6371000;
const earthCircumference = 2 * Math.PI * earthRadius;
const degreesRange = earthCircumference / 2;
const laneWidthMetres = 3.5;
export const laneLength = metresToDegrees(laneWidthMetres);
export function metresToDegrees(metres) {
    return (metres / degreesRange) * 180;
}
export function degreesToPixels(degrees) {
    return degrees * State.totalMultiplier.get();
}
export function metresToPixels(metres) {
    return degreesToPixels(metresToDegrees(metres));
}
