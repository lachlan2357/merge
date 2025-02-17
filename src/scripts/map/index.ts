import { laneLength, metresToPixels } from "../conversions.js";
import { DrawnElement, drawArrow, drawLine, drawPolygon, getSurfaceColour } from "../drawing.js";
import * as Sidebar from "./sidebar.js";
import * as Settings from "../settings/index.js";
import { Effect, State } from "../state/index.js";
import { getElement } from "../supplement/elements.js";
import { zoomIncrement } from "../supplement/index.js";
import { ScreenCoordinate, WorldCoordinate } from "../supplement/coordinate.js";
import "./buttons.js";

/** Structure containing all data required to calculate a zoom multiplier. */
export type MultiplierData = {
	/** The minimum latitude of any nodes. */
	minLat: number;
	/** The maximum latitude of any nodes. */
	maxLat: number;
	/** The minimum longitude of any nodes. */
	minLon: number;
	/** The maximum longitude of any nodes. */
	maxLon: number;
	/** The calculated multiplier. */
	multiplier: number;
};

/** Container to control drawing the map to a {@link HTMLCanvasElement}. */
class Canvas {
	/** Reference to the HTML Canvas element. */
	private readonly element: HTMLCanvasElement;

	/** Reference to the container for the {@link element}. */
	private readonly container: HTMLElement;

	/**
	 * Attach a canvas controller to a {@link HTMLCanvasElement}.
	 *
	 * @param id The ID of the {@link HTMLCanvasElement} to attach to.
	 * @param containerId The ID of the canvas container to attach to.
	 */
	constructor(id: string, containerId: string) {
		// fetch elements
		this.element = getElement(id, HTMLCanvasElement);
		this.container = getElement(containerId, HTMLElement);

		// setup event listeners
		this.element.addEventListener("mousedown", e => {
			e.preventDefault();
			if (!State.data.get()) return;

			const posRaw = ScreenCoordinate.fromMouseEvent(e);
			const pos = posRaw.subtract(State.mouseOffset.get());

			State.mouseDownPos.set(pos);
			State.mouseDown.set(true);
			State.mouseMoved.set(false);
		});

		this.element.addEventListener("mouseup", e => {
			e.preventDefault();
			if (!State.data.get()) return;

			if (!State.mouseMoved.get() && !this.checkHover()) {
				Sidebar.hide();
				State.selectedWay.set(-1);
			}

			State.mouseDown.set(false);
			State.mouseMoved.set(false);
		});

		this.element.addEventListener("mousemove", e => {
			e.preventDefault();
			if (!State.data.get()) return;

			const pos = ScreenCoordinate.fromMouseEvent(e);
			State.mousePos.set(pos);
			State.mouseMoved.set(true);

			if (State.mouseDown.get())
				State.mouseOffset.set(pos.subtract(State.mouseDownPos.get()));

			this.element.style.cursor = this.checkHover(false) ? "pointer" : "move";
		});

		this.element.addEventListener("wheel", e => {
			e.preventDefault();
			if (!State.data.get()) return;

			const inOut = e.deltaY > 0 ? "out" : "in";
			this.zoom(inOut, "mouse");
		});

		// setup resize triggers
		new ResizeObserver(() => this.setResolution()).observe(this.container);
	}

	/** Re-centre the canvas back to origin, resetting offset and zoom. */
	centre() {
		State.mouseOffset.set(new ScreenCoordinate());
		State.zoomOffset.set(new ScreenCoordinate());
		State.zoom.set(0);
	}

	/**
	 * Zoom the map in or out.
	 *
	 * @param inOut Whether to zoom the map in or out.
	 * @param source The source of the zoom, either from the mouse scroll wheel or the zoom buttons.
	 */
	zoom(inOut: "in" | "out", source: "mouse" | "button") {
		const totalMultiplierRaw = State.totalMultiplierRaw.get();

		const zoomPosition =
			source == "mouse"
				? State.mousePos.get().subtract(State.canvasOffset.get())
				: State.canvasDimensions.get().divide(2);

		const zoomCoord = zoomPosition.toWorld();

		if (inOut === "in") State.zoom.setDynamic(old => old + zoomIncrement);
		else if (totalMultiplierRaw - zoomIncrement > 0)
			State.zoom.setDynamic(old => old - zoomIncrement);
		else return;

		const newCoord = zoomCoord.toScreen();
		const diff = zoomPosition.subtract(newCoord);

		State.zoomOffset.setDynamic(old => old.add(diff));
	}

	/** Toggle whether the map should be displayed in fullscreen. */
	toggleFullscreen() {
		this.container.toggleAttribute("fullscreen");
	}

	/** Draw the map onto the canvas, taking consideration of zoom, offset, etc. */
	draw() {
		// clear canvas from previous drawings
		const dimensions = State.canvasDimensions.get();
		const context = this.getContext();
		const dataCache = State.data.get();

		if (!dataCache) return;
		else document.getElementById("empty-message")?.remove();

		// clear any previously-drawn elements
		context.clearRect(0, 0, dimensions.x, dimensions.y);
		State.drawnElements.set([]);

		const drawnElementsCache = new Array<DrawnElement>();
		dataCache.forEach((way, wayId) => {
			const lanes = way.tags.lanes.get();

			for (let i = 0; i < way.orderedNodes.length; i++) {
				const thisNodeId = way.orderedNodes[i];
				const nextNodeId = way.orderedNodes[i + 1];
				if (thisNodeId === undefined || nextNodeId === undefined) continue;

				const thisNode = way.nodes.get(thisNodeId);
				const nextNode = way.nodes.get(nextNodeId);

				if (thisNode === undefined || nextNode === undefined) continue;

				const x1 = thisNode.lon;
				const y1 = thisNode.lat;
				const x2 = nextNode.lon;
				const y2 = nextNode.lat;

				const thisPos = WorldCoordinate.fromOverpassNode(thisNode);
				const nextPos = WorldCoordinate.fromOverpassNode(nextNode);

				// angles are the atan of the gradient, however gradients
				// don't tell direction. the condition checks if the
				// configuration of points leads to a 'flipped' gradient
				const gradient = (y2 - y1) / (x2 - x1);
				const angle =
					(y1 > y2 && x1 > x2) || (y1 < y2 && x1 > x2)
						? Math.atan(gradient) + Math.PI
						: Math.atan(gradient);
				const adjacentAngle = angle + Math.PI / 2;
				const trigCoord = new WorldCoordinate(
					Math.cos(adjacentAngle),
					Math.sin(adjacentAngle)
				);

				// define the four corners of the box around the way
				const coefficient = (laneLength * lanes) / 2;
				const sinCoefficient = Math.sin(adjacentAngle) * coefficient;
				const cosCoefficient = Math.cos(adjacentAngle) * coefficient;
				const coordCoefficient = new WorldCoordinate(cosCoefficient, sinCoefficient);

				const thisTopCornerPos = thisPos.add(coordCoefficient);
				const thisBtmCornerPos = thisPos.subtract(coordCoefficient);
				const nextTopCornerPos = nextPos.add(coordCoefficient);
				const nextBtmCornerPos = nextPos.subtract(coordCoefficient);

				const allXPos = [
					thisPos.x,
					nextPos.x,
					thisTopCornerPos.x,
					thisBtmCornerPos.x,
					nextTopCornerPos.x,
					nextBtmCornerPos.x
				];
				const allYPos = [
					thisPos.y,
					nextPos.y,
					thisTopCornerPos.y,
					thisBtmCornerPos.y,
					nextTopCornerPos.y,
					nextBtmCornerPos.y
				];

				// check to see if any of the box is visible on screen
				type Position = "above" | "in" | "below" | "unknown";
				const allOffScreen = new Matrix<Position>(2, 6, "unknown");

				for (let i = 0; i < 6; i++) {
					const xPos = allXPos[i];
					const yPos = allYPos[i];
					if (xPos === undefined || yPos === undefined) continue;

					const xPosScreen = new WorldCoordinate(xPos, 0).toScreen().x;
					const yPosScreen = new WorldCoordinate(0, yPos).toScreen().y;

					if (xPosScreen < 0) allOffScreen.set(0, i, "above");
					else if (xPosScreen > dimensions.x) allOffScreen.set(0, i, "below");
					else allOffScreen.set(0, i, "in");

					if (yPosScreen < 0) allOffScreen.set(1, i, "above");
					else if (yPosScreen > dimensions.y) allOffScreen.set(1, i, "below");
					else allOffScreen.set(1, i, "in");
				}

				// check if the entire way is offscreen
				const isOffscreen =
					!allOffScreen.getArray(0)?.includes("in") ||
					!allOffScreen.getArray(1)?.includes("in");
				if (isOffscreen) continue;

				const lanesForward = way.tags.lanesForward.get();
				const lanesBackward = way.tags.lanesBackward.get();
				const turnLanesForward = way.tags.turnLanesForward.getBoth(value =>
					value.toString()
				);
				const turnLanesBackward = way.tags.turnLanesBackward.getBoth(value =>
					value.toString()
				);

				const leftTraffic = Settings.get("leftHandTraffic");
				const directionality = leftTraffic ? 1 : -1;

				for (let i = 0; i < lanes; i++) {
					const roadColour = getSurfaceColour(way.tags.surface.get());

					const thisCoefficient = trigCoord.multiply(laneLength).multiply(i);
					const nextCoefficient = trigCoord.multiply(laneLength).multiply(i + 1);

					const thisSrtCoord = thisTopCornerPos.subtract(thisCoefficient);
					const thisEndCoord = nextTopCornerPos.subtract(thisCoefficient);
					const nextSrtCoord = thisTopCornerPos.subtract(nextCoefficient);
					const nextEndCoord = nextTopCornerPos.subtract(nextCoefficient);

					drawPolygon([thisSrtCoord, thisEndCoord, nextEndCoord, nextSrtCoord], {
						thickness: metresToPixels(0.15),
						colour: "#dddddd",
						fill: roadColour
					});

					// turn markings
					let markings = new Array<string>();
					if (leftTraffic) {
						markings =
							i < lanesForward
								? turnLanesForward[i] || new Array<string>()
								: turnLanesBackward[
										turnLanesBackward.length + (lanesForward - i) - 1
									] || new Array<string>();
					} else {
						markings =
							i < lanesBackward
								? turnLanesBackward[i] || new Array<string>()
								: turnLanesForward[
										turnLanesForward.length + (lanesBackward - i) - 1
									] || new Array<string>();
					}

					const allX = [thisSrtCoord.x, thisEndCoord.x, nextSrtCoord.x, nextEndCoord.x];
					const allY = [thisSrtCoord.y, thisEndCoord.y, nextSrtCoord.y, nextEndCoord.y];

					const maxCoord = new WorldCoordinate(Math.max(...allX), Math.max(...allY));
					const minCoord = new WorldCoordinate(Math.min(...allX), Math.min(...allY));

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
						drawArrow("through", width, length, centre, angle);
					}

					if (markings.includes("left")) {
						drawArrow("left", width, length, centre, angle);
					}

					if (markings.includes("right")) {
						drawArrow("right", width, length, centre, angle);
					}
				}

				const trigCoefficient = trigCoord.multiply(laneLength).multiply(lanesForward);

				const centreStartCoord = thisTopCornerPos.subtract(trigCoefficient);
				const centreEndCoord = nextTopCornerPos.subtract(trigCoefficient);

				if (way.tags.oneway.eq(false))
					drawLine(centreStartCoord, centreEndCoord, {
						thickness: metresToPixels(0.5),
						colour: "white"
					});

				// draw select outline if selected
				const outlined = State.selectedWay.get() == wayId;
				const path = drawPolygon(
					[thisBtmCornerPos, thisTopCornerPos, nextTopCornerPos, nextBtmCornerPos],
					{
						thickness: outlined ? 5 : 1,
						colour: outlined ? "lightblue" : "#222233"
					}
				);

				// cache element to be updated later
				drawnElementsCache.push({ wayId, path });
			}
		});

		// update the list of drawn elements
		State.drawnElements.set(drawnElementsCache);
	}

	/** Resize the canvas to fit it's container. */
	setResolution() {
		const offset = ScreenCoordinate.ofElementOffset(this.container);
		const dimensions = ScreenCoordinate.ofElementDimensions(this.element);

		[this.element.width, this.element.height] = dimensions.get();

		State.canvasOffset.set(offset);
		State.canvasDimensions.set(dimensions);
	}

	/**
	 * Check whether any paths in the canvas are being hovered over and/or clicked.
	 *
	 * @param clicked Whether the user has clicked.
	 * @returns Whether any paths are currently being hovered over.
	 */
	checkHover(clicked = true) {
		const context = this.getContext();
		if (!State.data.get()) return false;

		const drawnCache = State.drawnElements.get();
		const canvasOffsetCache = State.canvasOffset.get();

		const mousePos = State.mousePos.get().subtract(canvasOffsetCache);
		let anyHovered = false;

		// check whether any paths are hovered over
		for (const element of drawnCache) {
			// see if path is hovered over
			const path = element.path;
			const isHovered = context.isPointInPath(path, ...mousePos.get());
			if (!isHovered) continue;
			anyHovered = true;

			// display popup if element is clicked
			const way = State.allWays.get().get(element.wayId);
			if (way === undefined) continue;
			if (clicked) Sidebar.show(element.wayId);
		}

		return anyHovered;
	}

	/**
	 * Retrieve the drawing context for this canvas.
	 *
	 * @returns The drawing context.
	 * @throws {Error} If the canvas rending context could not be retrieved.
	 */
	getContext() {
		const context = this.element.getContext("2d");
		if (context === null) throw new Error("Context could not be retrieved");
		return context;
	}
}

/** Main instance of the {@link HTMLCanvasElement}. */
export const CANVAS = new Canvas("canvas", "main");

// canvas effects
new Effect(() => CANVAS.draw());

/**
 * A two-dimension matrix of values.
 *
 * @template T The type of the matrix value. Currently this is restricted to primitives for proper
 *   comparisons and copying.
 */
class Matrix<T extends string | number> {
	/** The inner array storing the values of the matrix. */
	private readonly inner: Array<Array<T>>;

	/**
	 * Initialise a new {@link Matrix}.
	 *
	 * @param xLength The length of the matrix in the x-dimension.
	 * @param yLength The length of the matrix in the y-dimension.
	 * @param defaultValue The default value to set in all matrix cells.
	 */
	constructor(xLength: number, yLength: number, defaultValue: T) {
		this.inner = [];
		for (let i = 0; i < xLength; i++) {
			const arr = new Array<T>(yLength).fill(defaultValue);
			this.inner.push(arr);
		}
	}

	/**
	 * Retrieve the value stored in a particular cell.
	 *
	 * @param x The x-coordinate of the cell.
	 * @param y The y-coordinate of the cell.
	 * @returns The value stored in the cell, if the cell exists.
	 */
	get(x: number, y: number) {
		return this.getArray(x)?.[y];
	}

	/**
	 * Retrieve the array of cells at a particular x-coordinate.
	 *
	 * @param x The x-coordinate of the cell.
	 * @returns The array of cells at the x-coordinate, if the array exists.
	 */
	getArray(x: number) {
		return this.inner[x];
	}

	/**
	 * Set the value of a particular cell.
	 *
	 * If a particular {@link x}-{@link y} cell does not exist, nothing will be set.
	 *
	 * @param x The x-coordinate of the cell to set.
	 * @param y The y-coordinate of the cell to set.
	 * @param value The value to set the cell to.
	 */
	set(x: number, y: number, value: T) {
		if (this.inner[x] === undefined) return;
		if (this.inner[x][y] === undefined) return;
		this.inner[x][y] = value;
	}
}
