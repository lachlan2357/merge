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

/**
 * Retrieve the colour of a way surface.
 *
 * @param surface The surface to retrieve the colour of.
 * @returns The colour of the surface.
 */
export function getSurfaceColour(surface?: string) {
	if (surface === undefined) return defaultSurfaceColour;
	return surfaceColours.get(surface) ?? defaultSurfaceColour;
}

/** Structure to represent a way that has been drawn to the canvas. */
export type DrawnElement = {
	/** The ID of this way. */
	wayId: number;
	/** The {@link Path2D} that was used to draw this way. */
	path: Path2D;
};

/** Structure of all settings to control how a path is drawn to the canvas. */
type DrawingSettings = {
	/** The thickness, or width, of lines. */
	thickness?: number;
	/** The colour of lines. */
	colour?: string;
	/** The colour of the area fill. */
	fill?: string;
	/** The cap of how lines are ended/joined. */
	cap?: CanvasLineCap;
};

/**
 * Draw a line on the canvas.
 *
 * @param coordStart The start coordinate of the line.
 * @param coordEnd The end coordinate of the line.
 * @param settings Settings definition for the line.
 */
export function drawLine(
	coordStart: WorldCoordinate,
	coordEnd: WorldCoordinate,
	settings: DrawingSettings
) {
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

/**
 * Draw a polygon on the canvas.
 *
 * @param coordinates Coordinates of all vertices of the polygon.
 * @param settings Settings definition for the line.
 * @returns The path object of what was drawn.
 * @throws {DrawError} If the polygon could not be drawn.
 */
export function drawPolygon(coordinates: Array<WorldCoordinate>, settings: DrawingSettings) {
	const context = setStyle(settings);

	// convert to screen coordinates
	const coords = coordinates.map(world => world.toScreen());
	const start = coords[0];
	if (start === undefined) throw DrawError.polygonNotEnoughVertices(coords.length);

	// draw
	const path = new Path2D();

	path.moveTo(...start.get());
	for (let i = 0; i < coords.length; i++) {
		const coord = coords[i];
		if (coord === undefined) break;

		path.lineTo(...coord.get());
	}

	path.closePath();
	applyStyle(context, settings, path);

	return path;
}

/**
 * Draw an arrow on the canvas.
 *
 * @param type The type of arrow to draw.
 * @param width The width to draw the arrow with.
 * @param length The height to draw the arrow with.
 * @param centre The coordinate of the centre of the arrow.
 * @param angle The angle to draw the arrow at.
 */
export function drawArrow(
	type: "left" | "right" | "through",
	width: number,
	length: number,
	centre: WorldCoordinate,
	angle: number
) {
	const arrowBaseLength = width * 0.35;
	const arrowArmLength = arrowBaseLength / 2 / Math.tan(Math.PI / 12);

	const thickness = metresToPixels(0.2);
	const lineStyle: DrawingSettings = {
		thickness,
		colour: "white",
		cap: "round"
	};
	const backgroundStyle: DrawingSettings = {
		thickness: 0,
		colour: "white",
		fill: "white"
	};

	if (type == "through") {
		const lineStart = new WorldCoordinate(
			centre.x - ((Math.cos(angle) * length) / 2) * 0.9,
			centre.y - ((Math.sin(angle) * length) / 2) * 0.9
		);
		const lineEnd = new WorldCoordinate(
			centre.x + ((Math.cos(angle) * length) / 2) * 0.9,
			centre.y + ((Math.sin(angle) * length) / 2) * 0.9
		);

		const arrowArmAngle = angle + (Math.PI * 1) / 6;
		const arrowBaseAngle = arrowArmAngle - (Math.PI * 2) / 3;

		const arrowStart = new WorldCoordinate(
			lineEnd.x - (Math.cos(arrowArmAngle) * arrowArmLength) / 2,
			lineEnd.y - (Math.sin(arrowArmAngle) * arrowArmLength) / 2
		);
		const arrowEnd = new WorldCoordinate(
			arrowStart.x - Math.cos(arrowBaseAngle) * arrowBaseLength,
			arrowStart.y - Math.sin(arrowBaseAngle) * arrowBaseLength
		);

		drawLine(lineStart, lineEnd, lineStyle);
		drawPolygon([lineEnd, arrowStart, arrowEnd], backgroundStyle);
	} else if (type == "left") {
		const lineStart = new WorldCoordinate(
			centre.x - ((Math.cos(angle) * length) / 2) * 0.9,
			centre.y - ((Math.sin(angle) * length) / 2) * 0.9
		);
		const lineEnd = new WorldCoordinate(
			centre.x + ((Math.cos(angle) * length) / 2) * 0,
			centre.y + ((Math.sin(angle) * length) / 2) * 0
		);
		const arrowLineEnd = new WorldCoordinate(
			lineEnd.x + Math.cos(angle + Math.PI / 2) * width * 0.075,
			lineEnd.y + Math.sin(angle + Math.PI / 2) * width * 0.075
		);

		const arrowArmAngle = angle - (Math.PI * 1) / 3;
		const arrowBaseAngle = arrowArmAngle + (Math.PI * 2) / 3;

		const arrowStart = new WorldCoordinate(
			arrowLineEnd.x + (Math.cos(angle) * arrowBaseLength) / 2,
			arrowLineEnd.y + (Math.sin(angle) * arrowBaseLength) / 2
		);
		const arrowMid = new WorldCoordinate(
			arrowStart.x - (Math.cos(arrowArmAngle) * arrowArmLength) / 2,
			arrowStart.y - (Math.sin(arrowArmAngle) * arrowArmLength) / 2
		);
		const arrowEnd = new WorldCoordinate(
			arrowMid.x - (Math.cos(arrowBaseAngle) * arrowArmLength) / 2,
			arrowMid.y - (Math.sin(arrowBaseAngle) * arrowArmLength) / 2
		);

		drawLine(lineStart, lineEnd, lineStyle);
		drawLine(lineEnd, arrowLineEnd, lineStyle);
		drawPolygon([arrowStart, arrowMid, arrowEnd], backgroundStyle);
	} else if (type == "right") {
		const lineStart = new WorldCoordinate(
			centre.x - ((Math.cos(angle) * length) / 2) * 0.9,
			centre.y - ((Math.sin(angle) * length) / 2) * 0.9
		);
		const lineEnd = new WorldCoordinate(
			centre.x + ((Math.cos(angle) * length) / 2) * 0,
			centre.y + ((Math.sin(angle) * length) / 2) * 0
		);
		const arrowLineEnd = new WorldCoordinate(
			lineEnd.x + Math.cos(angle - Math.PI / 2) * width * 0.075,
			lineEnd.y + Math.sin(angle - Math.PI / 2) * width * 0.075
		);

		const arrowArmAngle = angle + (Math.PI * 1) / 3;
		const arrowBaseAngle = arrowArmAngle + (Math.PI * 1) / 3;

		const arrowStart = new WorldCoordinate(
			arrowLineEnd.x + (Math.cos(angle) * arrowBaseLength) / 2,
			arrowLineEnd.y + (Math.sin(angle) * arrowBaseLength) / 2
		);
		const arrowMid = new WorldCoordinate(
			arrowStart.x - (Math.cos(arrowArmAngle) * arrowArmLength) / 2,
			arrowStart.y - (Math.sin(arrowArmAngle) * arrowArmLength) / 2
		);
		const arrowEnd = new WorldCoordinate(
			arrowMid.x + (Math.cos(arrowBaseAngle) * arrowArmLength) / 2,
			arrowMid.y + (Math.sin(arrowBaseAngle) * arrowArmLength) / 2
		);

		drawLine(lineStart, lineEnd, lineStyle);
		drawLine(lineEnd, arrowLineEnd, lineStyle);
		drawPolygon([arrowStart, arrowMid, arrowEnd], backgroundStyle);
	}
}

/**
 * Set the canvas context to draw in a particular style.
 *
 * @param settings Settings definition for the line.
 * @returns The canvas rendering context.
 */
function setStyle(settings: DrawingSettings) {
	const context = CANVAS.getContext();

	context.strokeStyle = settings.colour || "black";
	context.lineWidth = settings.thickness || 1;
	context.fillStyle = settings.fill || "black";
	context.lineCap = settings.cap || "butt";

	return context;
}

/**
 * Apply a style to a drawn element.
 *
 * @param context The canvas rendering context.
 * @param settings Settings definition for the line.
 * @param path The path to style, if applicable.
 */
function applyStyle(context: CanvasRenderingContext2D, settings: DrawingSettings, path?: Path2D) {
	if (path === undefined) {
		if (settings.fill !== undefined) context.fill();
		if (settings.colour !== undefined) context.stroke();
	} else {
		if (settings.fill !== undefined) context.fill(path);
		if (settings.colour !== undefined) context.stroke(path);
	}
}

class DrawError extends Error {
	static polygonNotEnoughVertices(numVertices: number) {
		return new DrawError(
			`Drawing a polygon requires at least 1 vertex, however ${numVertices} vertices were provided.`
		);
	}
}
