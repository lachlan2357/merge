import { CANVAS } from "./map/canvas.js";
import { metresToPixels } from "./conversions.js";
import { WorldCoordinate } from "./types/coordinate.js";

export const roadColours = {
	asphalt: "#222233",
	chipseal: "#555c66",
	paved: "#bab6ac",
	concrete: "#cfc0b9",
	cobblestone: "#ffd6bc",
	paving_stones: "#ab9da4",
	unknown: "#000000"
};

export type DrawnElement = {
	wayId: number;
	path: Path2D;
};

type DrawingSettings = {
	thickness?: number;
	colour?: string;
	fill?: string;
	cap?: CanvasLineCap;
};

export class Draw {
	static line(coordStart: WorldCoordinate, coordEnd: WorldCoordinate, settings: DrawingSettings) {
		const context = this.setStyle(settings);

		// convert to screen coordinates
		const start = coordStart.toScreen();
		const end = coordEnd.toScreen();

		// draw
		context.beginPath();
		context.moveTo(...start.get());
		context.lineTo(...end.get());
		this.applyStyle(context, settings);
	}

	static polygon(coordinates: Array<WorldCoordinate>, settings: DrawingSettings) {
		const context = this.setStyle(settings);

		// convert to screen coordinates
		const coords = coordinates.map(world => world.toScreen());
		const start = coords[0];

		// draw
		const path = new Path2D();

		path.moveTo(...start.get());
		for (let i = 1; i < coords.length; i++) path.lineTo(...coords[i].get());

		path.closePath();
		this.applyStyle(context, settings, path);

		return path;
	}

	static arrow(
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

			this.line(lineStart, lineEnd, lineStyle);
			this.polygon([lineEnd, arrowStart, arrowEnd], backgroundStyle);
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

			this.line(lineStart, lineEnd, lineStyle);
			this.line(lineEnd, arrowLineEnd, lineStyle);
			this.polygon([arrowStart, arrowMid, arrowEnd], backgroundStyle);
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

			this.line(lineStart, lineEnd, lineStyle);
			this.line(lineEnd, arrowLineEnd, lineStyle);
			this.polygon([arrowStart, arrowMid, arrowEnd], backgroundStyle);
		}
	}

	static setStyle(settings: DrawingSettings) {
		const context = CANVAS.getContext();

		context.strokeStyle = settings.colour || "black";
		context.lineWidth = settings.thickness || 1;
		context.fillStyle = settings.fill || "black";
		context.lineCap = settings.cap || "butt";

		return context;
	}

	static applyStyle(context: CanvasRenderingContext2D, settings: DrawingSettings, path?: Path2D) {
		if (path === undefined) {
			if (settings.fill !== undefined) context.fill();
			if (settings.colour !== undefined) context.stroke();
		} else {
			if (settings.fill !== undefined) context.fill(path);
			if (settings.colour !== undefined) context.stroke(path);
		}
	}
}
