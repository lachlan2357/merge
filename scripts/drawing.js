import { metresToPixels } from "./conversions.js";
import { CANVAS } from "./map/canvas.js";
import { WorldCoordinate } from "./types/coordinate.js";
const surfaceColours = new Map([
    ["asphalt", "#222233"],
    ["chipseal", "#555c66"],
    ["paved", "#bab6ac"],
    ["concrete", "#cfc0b9"],
    ["cobblestone", "#ffd6bc"],
    ["paving_stones", "#ab9da4"]
]);
const defaultSurfaceColour = "#000000";
export function getSurfaceColour(surface) {
    if (surface === undefined)
        return defaultSurfaceColour;
    return surfaceColours.get(surface) ?? defaultSurfaceColour;
}
export function drawLine(coordStart, coordEnd, settings) {
    const context = setStyle(settings);
    // convert to screen coordinates
    const start = coordStart.toScreen();
    const end = coordEnd.toScreen();
    // draw
    context.beginPath();
    context.moveTo(...start.get());
    context.lineTo(...end.get());
    applyStyle(context, settings);
}
export function drawPolygon(coordinates, settings) {
    const context = setStyle(settings);
    // convert to screen coordinates
    const coords = coordinates.map(world => world.toScreen());
    const start = coords[0];
    // draw
    const path = new Path2D();
    path.moveTo(...start.get());
    for (let i = 1; i < coords.length; i++)
        path.lineTo(...coords[i].get());
    path.closePath();
    applyStyle(context, settings, path);
    return path;
}
export function drawArrow(type, width, length, centre, angle) {
    const arrowBaseLength = width * 0.35;
    const arrowArmLength = arrowBaseLength / 2 / Math.tan(Math.PI / 12);
    const thickness = metresToPixels(0.2);
    const lineStyle = {
        thickness,
        colour: "white",
        cap: "round"
    };
    const backgroundStyle = {
        thickness: 0,
        colour: "white",
        fill: "white"
    };
    if (type == "through") {
        const lineStart = new WorldCoordinate(centre.x - ((Math.cos(angle) * length) / 2) * 0.9, centre.y - ((Math.sin(angle) * length) / 2) * 0.9);
        const lineEnd = new WorldCoordinate(centre.x + ((Math.cos(angle) * length) / 2) * 0.9, centre.y + ((Math.sin(angle) * length) / 2) * 0.9);
        const arrowArmAngle = angle + (Math.PI * 1) / 6;
        const arrowBaseAngle = arrowArmAngle - (Math.PI * 2) / 3;
        const arrowStart = new WorldCoordinate(lineEnd.x - (Math.cos(arrowArmAngle) * arrowArmLength) / 2, lineEnd.y - (Math.sin(arrowArmAngle) * arrowArmLength) / 2);
        const arrowEnd = new WorldCoordinate(arrowStart.x - Math.cos(arrowBaseAngle) * arrowBaseLength, arrowStart.y - Math.sin(arrowBaseAngle) * arrowBaseLength);
        drawLine(lineStart, lineEnd, lineStyle);
        drawPolygon([lineEnd, arrowStart, arrowEnd], backgroundStyle);
    }
    else if (type == "left") {
        const lineStart = new WorldCoordinate(centre.x - ((Math.cos(angle) * length) / 2) * 0.9, centre.y - ((Math.sin(angle) * length) / 2) * 0.9);
        const lineEnd = new WorldCoordinate(centre.x + ((Math.cos(angle) * length) / 2) * 0, centre.y + ((Math.sin(angle) * length) / 2) * 0);
        const arrowLineEnd = new WorldCoordinate(lineEnd.x + Math.cos(angle + Math.PI / 2) * width * 0.075, lineEnd.y + Math.sin(angle + Math.PI / 2) * width * 0.075);
        const arrowArmAngle = angle - (Math.PI * 1) / 3;
        const arrowBaseAngle = arrowArmAngle + (Math.PI * 2) / 3;
        const arrowStart = new WorldCoordinate(arrowLineEnd.x + (Math.cos(angle) * arrowBaseLength) / 2, arrowLineEnd.y + (Math.sin(angle) * arrowBaseLength) / 2);
        const arrowMid = new WorldCoordinate(arrowStart.x - (Math.cos(arrowArmAngle) * arrowArmLength) / 2, arrowStart.y - (Math.sin(arrowArmAngle) * arrowArmLength) / 2);
        const arrowEnd = new WorldCoordinate(arrowMid.x - (Math.cos(arrowBaseAngle) * arrowArmLength) / 2, arrowMid.y - (Math.sin(arrowBaseAngle) * arrowArmLength) / 2);
        drawLine(lineStart, lineEnd, lineStyle);
        drawLine(lineEnd, arrowLineEnd, lineStyle);
        drawPolygon([arrowStart, arrowMid, arrowEnd], backgroundStyle);
    }
    else if (type == "right") {
        const lineStart = new WorldCoordinate(centre.x - ((Math.cos(angle) * length) / 2) * 0.9, centre.y - ((Math.sin(angle) * length) / 2) * 0.9);
        const lineEnd = new WorldCoordinate(centre.x + ((Math.cos(angle) * length) / 2) * 0, centre.y + ((Math.sin(angle) * length) / 2) * 0);
        const arrowLineEnd = new WorldCoordinate(lineEnd.x + Math.cos(angle - Math.PI / 2) * width * 0.075, lineEnd.y + Math.sin(angle - Math.PI / 2) * width * 0.075);
        const arrowArmAngle = angle + (Math.PI * 1) / 3;
        const arrowBaseAngle = arrowArmAngle + (Math.PI * 1) / 3;
        const arrowStart = new WorldCoordinate(arrowLineEnd.x + (Math.cos(angle) * arrowBaseLength) / 2, arrowLineEnd.y + (Math.sin(angle) * arrowBaseLength) / 2);
        const arrowMid = new WorldCoordinate(arrowStart.x - (Math.cos(arrowArmAngle) * arrowArmLength) / 2, arrowStart.y - (Math.sin(arrowArmAngle) * arrowArmLength) / 2);
        const arrowEnd = new WorldCoordinate(arrowMid.x + (Math.cos(arrowBaseAngle) * arrowArmLength) / 2, arrowMid.y + (Math.sin(arrowBaseAngle) * arrowArmLength) / 2);
        drawLine(lineStart, lineEnd, lineStyle);
        drawLine(lineEnd, arrowLineEnd, lineStyle);
        drawPolygon([arrowStart, arrowMid, arrowEnd], backgroundStyle);
    }
}
function setStyle(settings) {
    const context = CANVAS.getContext();
    context.strokeStyle = settings.colour || "black";
    context.lineWidth = settings.thickness || 1;
    context.fillStyle = settings.fill || "black";
    context.lineCap = settings.cap || "butt";
    return context;
}
function applyStyle(context, settings, path) {
    if (path === undefined) {
        if (settings.fill !== undefined)
            context.fill();
        if (settings.colour !== undefined)
            context.stroke();
    }
    else {
        if (settings.fill !== undefined)
            context.fill(path);
        if (settings.colour !== undefined)
            context.stroke(path);
    }
}
