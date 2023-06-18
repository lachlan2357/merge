import { context } from "../script.js";
import { degreesToPixels, metresToDegrees } from "./conversions.js";
import { Coordinate } from "./index.js";
import { getTotalMultiplier, getOffset } from "./view.js";

export function line(
	coordStart: Coordinate,
	coordEnd: Coordinate,
	strokeThickness: number | null = null,
	strokeColour: string | null = null,
	fillColour: string | null = null,
	lineCap: "butt" | "round" | "square" = "butt"
) {
	// set zoom and offset
	const totalMultiplier: number = getTotalMultiplier();
	const offset: Coordinate = getOffset(totalMultiplier);

	// draw
	context.strokeStyle = strokeColour || "black";
	context.lineWidth = strokeThickness || 1;
	context.fillStyle = fillColour || "black";
	context.lineCap = lineCap;

	context.beginPath();
	context.moveTo(
		offset.x + coordStart.x * totalMultiplier,
		offset.y - coordStart.y * totalMultiplier
	);
	context.lineTo(
		offset.x + coordEnd.x * totalMultiplier,
		offset.y - coordEnd.y * totalMultiplier
	);

	if (fillColour != null) context.fill();
	if (strokeColour != null) context.stroke();
}

export function polygon(
	coordinates: Coordinate[],
	strokeThickness: number | null = null,
	strokeColour: string | null = null,
	fillColour: string | null = null
) {
	// set zoom and offset
	const totalMultiplier: number = getTotalMultiplier();
	const offset: Coordinate = getOffset(totalMultiplier);

	context.strokeStyle = strokeColour || "black";
	context.lineWidth = strokeThickness || 1;
	context.fillStyle = fillColour || "black";
	context.lineCap = "round";

	const path = new Path2D();

	path.moveTo(
		offset.x + coordinates[0].x * totalMultiplier,
		offset.y - coordinates[0].y * totalMultiplier
	);
	for (let i = 1; i < coordinates.length; i++) {
		path.lineTo(
			offset.x + coordinates[i].x * totalMultiplier,
			offset.y - coordinates[i].y * totalMultiplier
		);
	}

	path.closePath();

	if (strokeColour != null) {
		context.stroke(path);
	}
	if (fillColour != null) {
		context.fill(path);
	}

	return path;
}

export function arrow(
	type: "left" | "right" | "through",
	width: number,
	length: number,
	centre: Coordinate,
	angle: number
) {
	const arrowBaseLength = width * 0.35;
	const arrowArmLength = arrowBaseLength / 2 / Math.tan(Math.PI / 12);

	if (type == "through") {
		const lineStart = new Coordinate(
			centre.x - ((Math.cos(angle) * length) / 2) * 0.9,
			centre.y - ((Math.sin(angle) * length) / 2) * 0.9
		);
		const lineEnd = new Coordinate(
			centre.x + ((Math.cos(angle) * length) / 2) * 0.9,
			centre.y + ((Math.sin(angle) * length) / 2) * 0.9
		);

		const arrowArmAngle = angle + (Math.PI * 1) / 6;
		const arrowBaseAngle = arrowArmAngle - (Math.PI * 2) / 3;

		const arrowStart = new Coordinate(
			lineEnd.x - (Math.cos(arrowArmAngle) * arrowArmLength) / 2,
			lineEnd.y - (Math.sin(arrowArmAngle) * arrowArmLength) / 2
		);
		const arrowEnd = new Coordinate(
			arrowStart.x - Math.cos(arrowBaseAngle) * arrowBaseLength,
			arrowStart.y - Math.sin(arrowBaseAngle) * arrowBaseLength
		);

		line(
			lineStart,
			lineEnd,
			degreesToPixels(metresToDegrees(0.2)),
			"white",
			null,
			"round"
		);
		polygon([lineEnd, arrowStart, arrowEnd], 0, "white", "white");
	} else if (type == "left") {
		const lineStart = new Coordinate(
			centre.x - ((Math.cos(angle) * length) / 2) * 0.9,
			centre.y - ((Math.sin(angle) * length) / 2) * 0.9
		);
		const lineEnd = new Coordinate(
			centre.x + ((Math.cos(angle) * length) / 2) * 0,
			centre.y + ((Math.sin(angle) * length) / 2) * 0
		);
		const arrowLineEnd = new Coordinate(
			lineEnd.x + Math.cos(angle + Math.PI / 2) * width * 0.075,
			lineEnd.y + Math.sin(angle + Math.PI / 2) * width * 0.075
		);

		const arrowArmAngle = angle - (Math.PI * 1) / 3;
		const arrowBaseAngle = arrowArmAngle + (Math.PI * 2) / 3;

		const arrowStart = new Coordinate(
			arrowLineEnd.x + (Math.cos(angle) * arrowBaseLength) / 2,
			arrowLineEnd.y + (Math.sin(angle) * arrowBaseLength) / 2
		);
		const arrowMid = new Coordinate(
			arrowStart.x - (Math.cos(arrowArmAngle) * arrowArmLength) / 2,
			arrowStart.y - (Math.sin(arrowArmAngle) * arrowArmLength) / 2
		);
		const arrowEnd = new Coordinate(
			arrowMid.x - (Math.cos(arrowBaseAngle) * arrowArmLength) / 2,
			arrowMid.y - (Math.sin(arrowBaseAngle) * arrowArmLength) / 2
		);

		line(
			lineStart,
			lineEnd,
			degreesToPixels(metresToDegrees(0.2)),
			"white",
			null,
			"round"
		);
		line(
			lineEnd,
			arrowLineEnd,
			degreesToPixels(metresToDegrees(0.2)),
			"white",
			null,
			"round"
		);
		polygon([arrowStart, arrowMid, arrowEnd], 0, "white", "white");
	} else if (type == "right") {
		const lineStart = new Coordinate(
			centre.x - ((Math.cos(angle) * length) / 2) * 0.9,
			centre.y - ((Math.sin(angle) * length) / 2) * 0.9
		);
		const lineEnd = new Coordinate(
			centre.x + ((Math.cos(angle) * length) / 2) * 0,
			centre.y + ((Math.sin(angle) * length) / 2) * 0
		);
		const arrowLineEnd = new Coordinate(
			lineEnd.x + Math.cos(angle - Math.PI / 2) * width * 0.075,
			lineEnd.y + Math.sin(angle - Math.PI / 2) * width * 0.075
		);

		const arrowArmAngle = angle + (Math.PI * 1) / 3;
		const arrowBaseAngle = arrowArmAngle + (Math.PI * 1) / 3;

		const arrowStart = new Coordinate(
			arrowLineEnd.x + (Math.cos(angle) * arrowBaseLength) / 2,
			arrowLineEnd.y + (Math.sin(angle) * arrowBaseLength) / 2
		);
		const arrowMid = new Coordinate(
			arrowStart.x - (Math.cos(arrowArmAngle) * arrowArmLength) / 2,
			arrowStart.y - (Math.sin(arrowArmAngle) * arrowArmLength) / 2
		);
		const arrowEnd = new Coordinate(
			arrowMid.x + (Math.cos(arrowBaseAngle) * arrowArmLength) / 2,
			arrowMid.y + (Math.sin(arrowBaseAngle) * arrowArmLength) / 2
		);

		line(
			lineStart,
			lineEnd,
			degreesToPixels(metresToDegrees(0.2)),
			"white",
			null,
			"round"
		);
		line(
			lineEnd,
			arrowLineEnd,
			degreesToPixels(metresToDegrees(0.2)),
			"white",
			null,
			"round"
		);
		polygon([arrowStart, arrowMid, arrowEnd], 0, "white", "white");
	}
}
