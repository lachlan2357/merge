import {
	coordToScreenSpace,
	laneLength,
	metresToPixels,
	screenSpaceToCoord
} from "./conversions.js";
import { displayPopup, getContext, getElement } from "./dom.js";
import { Draw } from "./drawing.js";
import { roadColours } from "./drawing.js";
import { Settings } from "./settings.js";
import { Coordinate, zoomIncrement } from "./supplement.js";
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

export class Canvas {
	private static canvas: HTMLCanvasElement = getElement("canvas");

	static centre() {
		mouseOffset.set(new Coordinate());
		zoomOffset.set(new Coordinate());
		zoom.set(0);
	}

	static zoom(inOut: "in" | "out", source: "mouse" | "button") {
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

	static draw() {
		// clear canvas from previous drawings
		const dimensions = canvasDimensions.get();
		const context = this.getContext();
		const dataCache = data.get();

		if (!dataCache || !context) return;
		else document.getElementById("empty-message")?.remove();

		context.clearRect(0, 0, dimensions.x, dimensions.y);
		drawnElements.set({});

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

				type Position = "above" | "in" | "below" | "unknown";
				const allOffScreen = new Array(
					new Array<Position>().fill("unknown", 0, 6),
					new Array<Position>().fill("unknown", 0, 6)
				);

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
					(val, _, arr) => val === arr[0]
				);
				const allYEqual = allOffScreen[1].every(
					(val, _, arr) => val === arr[0]
				);

				// check if the entire way is offscreen
				if (
					(allXEqual && allOffScreen[0][0] != "in") ||
					(allYEqual && allOffScreen[1][0] != "in")
				)
					return;

				const lanesForward =
					way.tags.lanesForward ?? (way.tags.oneway ? lanes : lanes / 2);
				const lanesBackward =
					way.tags.lanesBackward ?? (way.tags.oneway ? 0 : lanes / 2);
				const turnLanesForward =
					(way.tags.turnLanesForward ?? way.tags.oneway
						? way.tags.turnLanes
						: undefined) ?? new Array<Array<string>>();
				const turnLanesBackward =
					way.tags.turnLanesBackward ?? new Array<Array<string>>();

				const leftTraffic = Settings.get("leftHandTraffic");
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

					Draw.polygon(
						[thisSrtCoord, thisEndCoord, nextEndCoord, nextSrtCoord],
						{
							thickness: metresToPixels(0.15),
							colour: "#dddddd",
							fill: roadColour
						}
					);

					// turn markings
					let markings = new Array<string>();
					if (leftTraffic) {
						markings =
							i < lanesForward
								? turnLanesForward[i] || new Array<string>()
								: turnLanesBackward[
								turnLanesBackward.length +
								(lanesForward - i) -
								1
								] || new Array<string>();
					} else {
						markings =
							i < lanesBackward
								? turnLanesBackward[i] || new Array<string>()
								: turnLanesForward[
								turnLanesForward.length +
								(lanesBackward - i) -
								1
								] || new Array<string>();
					}

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
						Draw.arrow("through", width, length, centre, angle);
					}

					if (markings.includes("left")) {
						Draw.arrow("left", width, length, centre, angle);
					}

					if (markings.includes("right")) {
						Draw.arrow("right", width, length, centre, angle);
					}
				}

				const trigCoefficient = trigCoord
					.multiply(laneLength)
					.multiply(lanesForward);

				const centreStartCoord = thisTopCornerPos.subtract(trigCoefficient);
				const centreEndCoord = nextTopCornerPos.subtract(trigCoefficient);

				if (!way.tags.oneway)
					Draw.line(
						centreStartCoord,
						centreEndCoord,
						{
							thickness: metresToPixels(0.5),
							colour: "white"
						}
					);

				// draw select outline if selected
				const outlined = selectedWay.get() == wayId;
				const path = Draw.polygon(
					[
						thisBtmCornerPos,
						thisTopCornerPos,
						nextTopCornerPos,
						nextBtmCornerPos
					],
					{
						thickness: outlined ? 5 : 1,
						colour: outlined ? "lightblue" : "#222233"
					}
				);

				if (path === undefined) return;

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

	static checkHover(clicked = true) {
		const context = getContext();
		if (!data.get() || !context) return;

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
				if (clicked) displayPopup(element, way);
				return true;
			}

			return false;
		});

		return results.includes(true);
	}

	static getContext() {
		const context = this.canvas.getContext("2d");
		if (context === null) throw new Error("Context could not be retrieved");
		return context;
	}
}