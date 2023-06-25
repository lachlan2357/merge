import { context, settings } from "../script.js";
import {
	coordToScreenSpace,
	laneLength,
	metresToPixels,
	screenSpaceToCoord
} from "./conversions.js";
import { displayPopup } from "./dom.js";
import * as draw from "./drawing.js";
import { roadColours } from "./drawing.js";
import { Coordinate, zoomIncrement } from "./index.js";
import {
	allWays,
	canvasDimensions,
	canvasOffset,
	data,
	drawnElements,
	mouseOffset,
	mousePos,
	selectedWay,
	totalMultiplier,
	zoom,
	zoomOffset
} from "./view.js";

export function centre() {
	mouseOffset.set(new Coordinate());
	zoomOffset.set(new Coordinate());
	zoom.set(0);
}

export function zoomInOut(inOut: "in" | "out", source: "mouse" | "button") {
	const totalMultiplierRaw = Math.sqrt(totalMultiplier.get());

	const mousePosition =
		source == "mouse"
			? mousePos.get().subtract(canvasOffset.get())
			: canvasDimensions.get().divide(2);

	const mouseCoord = screenSpaceToCoord(mousePosition);

	if (inOut === "in") zoom.setDynamic(old => old + zoomIncrement);
	else if (totalMultiplierRaw - zoomIncrement > 0)
		zoom.setDynamic(old => old - zoomIncrement);

	const newCoord = coordToScreenSpace(mouseCoord);
	const diff = mousePosition.subtract(newCoord);

	zoomOffset.setDynamic(old => old.add(diff));
}

export async function drawCanvas() {
	// clear canvas from previous drawings
	const dimensions = canvasDimensions.get();
	context.clearRect(0, 0, dimensions.x, dimensions.y);
	drawnElements.set({});

	const dataCache = data.get();
	if (!dataCache) return;
	else document.getElementById("empty-message")?.remove();

	settings.set("ignoreCache", false);

	dataCache.forEach((way, wayId) => {
		const lanes = way.tags.lanes || 2;
		way.orderedNodes.forEach((thisNodeId, index) => {
			const nextNodeId = way.orderedNodes[index + 1];
			const thisNode = way.nodes.get(thisNodeId);
			const nextNode = way.nodes.get(nextNodeId);

			if (!thisNode || !nextNode) return;

			const x1 = thisNode.lon;
			const y1 = thisNode.lat;
			const x2 = nextNode.lon;
			const y2 = nextNode.lat;

			const thisPos = new Coordinate(x1, y1);
			const nextPos = new Coordinate(x2, y2);

			// angles are the atan of the gradient, however gradients
			// don't tell direction. the condition checks if the
			// configuration of points leads to a 'flipped' gradient
			const gradient = (y2 - y1) / (x2 - x1);
			const angle =
				(y1 > y2 && x1 > x2) || (y1 < y2 && x1 > x2)
					? Math.atan(gradient) + Math.PI
					: Math.atan(gradient);
			const adjacentAngle = angle + Math.PI / 2;
			const trigCoord = new Coordinate(
				Math.cos(adjacentAngle),
				Math.sin(adjacentAngle)
			);

			// define the four corners of the box around the way
			const coefficient = (laneLength * lanes) / 2;
			const sinCoefficient = Math.sin(adjacentAngle) * coefficient;
			const cosCoefficient = Math.cos(adjacentAngle) * coefficient;
			const coordCoefficient = new Coordinate(
				cosCoefficient,
				sinCoefficient
			);

			const thisTopCornerPos = thisPos.add(coordCoefficient);
			const thisBtmCornerPos = thisPos.subtract(coordCoefficient);
			const nextTopCornerPos = nextPos.add(coordCoefficient);
			const nextBtmCornerPos = nextPos.subtract(coordCoefficient);

			const allPos = [
				[
					thisPos.x,
					nextPos.x,
					thisTopCornerPos.x,
					thisBtmCornerPos.x,
					nextTopCornerPos.x,
					nextBtmCornerPos.x
				],
				[
					thisPos.y,
					nextPos.y,
					thisTopCornerPos.y,
					thisBtmCornerPos.y,
					nextTopCornerPos.y,
					nextBtmCornerPos.y
				]
			];
			const allOffScreen: ("above" | "in" | "below" | "unknown")[][] = [
				[
					"unknown",
					"unknown",
					"unknown",
					"unknown",
					"unknown",
					"unknown"
				],
				[
					"unknown",
					"unknown",
					"unknown",
					"unknown",
					"unknown",
					"unknown"
				]
			];

			// check to see if any of the box is visible on screen
			for (let i = 0; i < 6; i++) {
				const xPos = coordToScreenSpace(
					new Coordinate(allPos[0][i], 0)
				).x;
				const yPos = coordToScreenSpace(
					new Coordinate(0, allPos[1][i])
				).y;

				if (xPos < 0) allOffScreen[0][i] = "above";
				else if (xPos > dimensions.x) allOffScreen[0][i] = "below";
				else allOffScreen[0][i] = "in";

				if (yPos < 0) allOffScreen[1][i] = "above";
				else if (yPos > dimensions.y) allOffScreen[1][i] = "below";
				else allOffScreen[1][i] = "in";
			}

			const allXEqual = allOffScreen[0].every(
				(val, i, arr) => val === arr[0]
			);
			const allYEqual = allOffScreen[1].every(
				(val, i, arr) => val === arr[0]
			);

			// check if the entire way is offscreen
			if (
				(allXEqual && allOffScreen[0][0] != "in") ||
				(allYEqual && allOffScreen[1][0] != "in")
			)
				return;

			const lanesForward =
				way["lanes:forward"] || (way.tags.oneway ? lanes : lanes / 2);
			const lanesBackward =
				way["lanes:backward"] || (way.tags.oneway ? 0 : lanes / 2);
			const turnLanesForward = (
				way["turn:lanes:forward"] || "none"
			).split("|");
			const turnLanesBackward = (
				way["turn:lanes:backward"] || "none"
			).split("|");

			const leftTraffic = settings.get("leftHandTraffic");
			const directionality = leftTraffic ? 1 : -1;

			for (let i = 0; i < lanes; i++) {
				const roadColour =
					roadColours[
						Object.keys(roadColours).includes(
							way.tags.surface || "unknown"
						)
							? way.tags.surface || "unknown"
							: "unknown"
					];

				const thisCoefficient = trigCoord
					.multiply(laneLength)
					.multiply(i);
				const nextCoefficient = trigCoord
					.multiply(laneLength)
					.multiply(i + 1);

				const thisSrtCoord = thisTopCornerPos.subtract(thisCoefficient);
				const thisEndCoord = nextTopCornerPos.subtract(thisCoefficient);
				const nextSrtCoord = thisTopCornerPos.subtract(nextCoefficient);
				const nextEndCoord = nextTopCornerPos.subtract(nextCoefficient);

				draw.polygon(
					[thisSrtCoord, thisEndCoord, nextEndCoord, nextSrtCoord],
					metresToPixels(0.15),
					"#dddddd",
					roadColour
				);

				// turn markings
				let lanesString: string;
				if (leftTraffic) {
					lanesString =
						i < lanesForward
							? turnLanesForward[i] || "none"
							: turnLanesBackward[
									turnLanesBackward.length +
										(lanesForward - i) -
										1
							  ] || "none";
				} else {
					lanesString =
						i < lanesBackward
							? turnLanesBackward[i] || "none"
							: turnLanesForward[
									turnLanesForward.length +
										(lanesBackward - i) -
										1
							  ] || "none";
				}

				const markings = lanesString.includes(";")
					? lanesString.split(";")
					: [lanesString];

				const allX = [
					thisSrtCoord.x,
					thisEndCoord.x,
					nextSrtCoord.x,
					nextEndCoord.x
				];
				const allY = [
					thisSrtCoord.y,
					thisEndCoord.y,
					nextSrtCoord.y,
					nextEndCoord.y
				];

				const maxCoord = new Coordinate(
					Math.max(...allX),
					Math.max(...allY)
				);
				const minCoord = new Coordinate(
					Math.min(...allX),
					Math.min(...allY)
				);

				// find the length and width, adjusting to be negative if it is
				// a "backwards" lanes
				const centre = maxCoord.add(minCoord).divide(2);
				const length =
					Math.sqrt(
						(thisSrtCoord.x - thisEndCoord.x) ** 2 +
							(thisSrtCoord.y - thisEndCoord.y) ** 2
					) * (i < lanesForward ? directionality : -directionality);
				const width =
					Math.sqrt(
						(thisSrtCoord.x - nextSrtCoord.x) ** 2 +
							(thisSrtCoord.y - nextSrtCoord.y) ** 2
					) * (i < lanesForward ? directionality : -directionality);

				if (markings.includes("through")) {
					draw.arrow("through", width, length, centre, angle);
				}

				if (markings.includes("left")) {
					draw.arrow("left", width, length, centre, angle);
				}

				if (markings.includes("right")) {
					draw.arrow("right", width, length, centre, angle);
				}
			}

			const trigCoefficient = trigCoord
				.multiply(laneLength)
				.multiply(lanesForward);

			const centreStartCoord = thisTopCornerPos.subtract(trigCoefficient);
			const centreEndCoord = nextTopCornerPos.subtract(trigCoefficient);

			if (!way.tags.oneway)
				draw.line(
					centreStartCoord,
					centreEndCoord,
					metresToPixels(0.5),
					"white"
				);

			// draw select outline if selected
			const outlined = selectedWay.get() == wayId;
			const path = draw.polygon(
				[
					thisBtmCornerPos,
					thisTopCornerPos,
					nextTopCornerPos,
					nextBtmCornerPos
				],
				outlined ? 5 : 1,
				outlined ? "lightblue" : "#222233"
			);

			drawnElements.setDynamic(old => {
				const key = Object.keys(old).length;
				return {
					...old,
					[key]: { wayId, path }
				};
			});
		});
	});
}

export function hoverPath(click = true) {
	if (!data.get()) return;

	const drawnCache = drawnElements.get();
	const canvasOffsetCache = canvasOffset.get();
	const results = Object.keys(drawnCache).map(id => {
		const element: { wayId: number; path: Path2D } = drawnCache[id];
		const way = allWays.get().get(element.wayId);
		const path = element.path;

		if (!way) return false;

		if (
			context.isPointInPath(
				path,
				mousePos.get().x - canvasOffsetCache.x,
				mousePos.get().y - canvasOffsetCache.y
			)
		) {
			if (click) displayPopup(element, way);
			return true;
		}

		return false;
	});

	return results.includes(true);
}
