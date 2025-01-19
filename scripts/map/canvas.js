import { laneLength, metresToPixels } from "../conversions.js";
import { drawArrow, drawLine, drawPolygon, getSurfaceColour } from "../drawing.js";
import { WAY_INFO, displaySidebar } from "../popup/index.js";
import { Settings } from "../settings.js";
import { Effect, State } from "../state/index.js";
import { getElement } from "../supplement/elements.js";
import { zoomIncrement } from "../supplement/index.js";
import { ScreenCoordinate, WorldCoordinate } from "../types/coordinate.js";
import "./buttons.js";
class Canvas {
    /**
     * Reference to the HTML Canvas element.
     */
    element;
    /**
     * Reference to the container for the {@link element}.
     */
    container;
    /**
     * Reference to the parent element of the {@link container}.
     */
    containerParent;
    /**
     * Attach a canvas controller to a {@link HTMLCanvasElement}.
     *
     * @param id The ID of the {@link HTMLCanvasElement} to attach to.
     * @param containerId The ID of the canvas container to attach to.
     */
    constructor(id, containerId, containerParentId) {
        // fetch elements
        this.element = getElement(id, HTMLCanvasElement);
        this.container = getElement(containerId, HTMLDivElement);
        this.containerParent = getElement(containerParentId, HTMLElement);
        // setup event listeners
        this.element.addEventListener("mousedown", e => {
            e.preventDefault();
            if (!State.data.get())
                return;
            const posRaw = ScreenCoordinate.fromMouseEvent(e);
            const pos = posRaw.subtract(State.mouseOffset.get());
            State.mouseDownPos.set(pos);
            State.mouseDown.set(true);
            State.mouseMoved.set(false);
        });
        this.element.addEventListener("mouseup", e => {
            e.preventDefault();
            if (!State.data.get())
                return;
            if (!State.mouseMoved.get() && !this.checkHover()) {
                WAY_INFO.setAttribute("hidden", "");
                State.selectedWay.set(-1);
            }
            State.mouseDown.set(false);
            State.mouseMoved.set(false);
        });
        this.element.addEventListener("mousemove", e => {
            e.preventDefault();
            if (!State.data.get())
                return;
            const pos = ScreenCoordinate.fromMouseEvent(e);
            State.mousePos.set(pos);
            State.mouseMoved.set(true);
            if (State.mouseDown.get())
                State.mouseOffset.set(pos.subtract(State.mouseDownPos.get()));
            this.element.style.cursor = this.checkHover(false) ? "pointer" : "move";
        });
        this.element.addEventListener("wheel", e => {
            e.preventDefault();
            if (!State.data.get())
                return;
            const inOut = e.deltaY > 0 ? "out" : "in";
            this.zoom(inOut, "mouse");
        });
        // setup resize triggers
        new ResizeObserver(() => this.resize()).observe(this.container);
    }
    /**
     * Re-centre the canvas back to origin, resetting offset and zoom.
     */
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
    zoom(inOut, source) {
        const totalMultiplierRaw = State.totalMultiplierRaw.get();
        const zoomPosition = source == "mouse"
            ? State.mousePos.get().subtract(State.canvasOffset.get())
            : State.canvasDimensions.get().divide(2);
        const zoomCoord = zoomPosition.toWorld();
        if (inOut === "in")
            State.zoom.setDynamic(old => old + zoomIncrement);
        else if (totalMultiplierRaw - zoomIncrement > 0)
            State.zoom.setDynamic(old => old - zoomIncrement);
        else
            return;
        const newCoord = zoomCoord.toScreen();
        const diff = zoomPosition.subtract(newCoord);
        State.zoomOffset.setDynamic(old => old.add(diff));
    }
    /**
     * Toggle whether the map should be displayed in fullscreen.
     */
    toggleFullscreen() {
        this.container.toggleAttribute("fullscreen");
    }
    /**
     * Draw the map onto the canvas, taking consideration of zoom, offset, etc.
     */
    draw() {
        // clear canvas from previous drawings
        const dimensions = State.canvasDimensions.get();
        const context = this.getContext();
        const dataCache = State.data.get();
        if (!dataCache)
            return;
        else
            document.getElementById("empty-message")?.remove();
        // clear any previously-drawn elements
        context.clearRect(0, 0, dimensions.x, dimensions.y);
        State.drawnElements.set(new Array());
        const drawnElementsCache = new Array();
        dataCache.forEach((way, wayId) => {
            const lanes = way.tags.lanes.get();
            for (let i = 0; i < way.orderedNodes.length; i++) {
                const thisNodeId = way.orderedNodes[i];
                const nextNodeId = way.orderedNodes[i + 1];
                const thisNode = way.nodes.get(thisNodeId);
                const nextNode = way.nodes.get(nextNodeId);
                if (!thisNode || !nextNode)
                    continue;
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
                const angle = (y1 > y2 && x1 > x2) || (y1 < y2 && x1 > x2)
                    ? Math.atan(gradient) + Math.PI
                    : Math.atan(gradient);
                const adjacentAngle = angle + Math.PI / 2;
                const trigCoord = new WorldCoordinate(Math.cos(adjacentAngle), Math.sin(adjacentAngle));
                // define the four corners of the box around the way
                const coefficient = (laneLength * lanes) / 2;
                const sinCoefficient = Math.sin(adjacentAngle) * coefficient;
                const cosCoefficient = Math.cos(adjacentAngle) * coefficient;
                const coordCoefficient = new WorldCoordinate(cosCoefficient, sinCoefficient);
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
                const allOffScreen = new Array(new Array().fill("unknown", 0, 6), new Array().fill("unknown", 0, 6));
                for (let i = 0; i < 6; i++) {
                    const xPos = new WorldCoordinate(allPos[0][i], 0).toScreen().x;
                    const yPos = new WorldCoordinate(0, allPos[1][i]).toScreen().y;
                    if (xPos < 0)
                        allOffScreen[0][i] = "above";
                    else if (xPos > dimensions.x)
                        allOffScreen[0][i] = "below";
                    else
                        allOffScreen[0][i] = "in";
                    if (yPos < 0)
                        allOffScreen[1][i] = "above";
                    else if (yPos > dimensions.y)
                        allOffScreen[1][i] = "below";
                    else
                        allOffScreen[1][i] = "in";
                }
                const allXEqual = allOffScreen[0].every((val, _, arr) => val === arr[0]);
                const allYEqual = allOffScreen[1].every((val, _, arr) => val === arr[0]);
                // check if the entire way is offscreen
                if ((allXEqual && allOffScreen[0][0] != "in") ||
                    (allYEqual && allOffScreen[1][0] != "in"))
                    continue;
                const lanesForward = way.tags.lanesForward.get();
                const lanesBackward = way.tags.lanesBackward.get();
                const turnLanesForward = way.tags.turnLanesForward.getBoth(value => value.toString());
                const turnLanesBackward = way.tags.turnLanesBackward.getBoth(value => value.toString());
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
                    let markings = new Array();
                    if (leftTraffic) {
                        markings =
                            i < lanesForward
                                ? turnLanesForward[i] || new Array()
                                : turnLanesBackward[turnLanesBackward.length + (lanesForward - i) - 1] || new Array();
                    }
                    else {
                        markings =
                            i < lanesBackward
                                ? turnLanesBackward[i] || new Array()
                                : turnLanesForward[turnLanesForward.length + (lanesBackward - i) - 1] || new Array();
                    }
                    const allX = [thisSrtCoord.x, thisEndCoord.x, nextSrtCoord.x, nextEndCoord.x];
                    const allY = [thisSrtCoord.y, thisEndCoord.y, nextSrtCoord.y, nextEndCoord.y];
                    const maxCoord = new WorldCoordinate(Math.max(...allX), Math.max(...allY));
                    const minCoord = new WorldCoordinate(Math.min(...allX), Math.min(...allY));
                    // find the length and width, adjusting to be negative if it is
                    // a "backwards" lanes
                    const centre = maxCoord.add(minCoord).divide(2);
                    const length = Math.sqrt((thisSrtCoord.x - thisEndCoord.x) ** 2 +
                        (thisSrtCoord.y - thisEndCoord.y) ** 2) * (i < lanesForward ? directionality : -directionality);
                    const width = Math.sqrt((thisSrtCoord.x - nextSrtCoord.x) ** 2 +
                        (thisSrtCoord.y - nextSrtCoord.y) ** 2) * (i < lanesForward ? directionality : -directionality);
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
                const path = drawPolygon([thisBtmCornerPos, thisTopCornerPos, nextTopCornerPos, nextBtmCornerPos], {
                    thickness: outlined ? 5 : 1,
                    colour: outlined ? "lightblue" : "#222233"
                });
                // cache element to be updated later
                drawnElementsCache.push({ wayId, path });
            }
        });
        // update the list of drawn elements
        State.drawnElements.set(drawnElementsCache);
    }
    /**
     * Resize the canvas to fit it's container.
     */
    resize() {
        const dimensions = ScreenCoordinate.ofElementDimensions(this.container);
        const localOffset = ScreenCoordinate.ofElementOffset(this.container);
        const containerOffset = ScreenCoordinate.ofElementOffset(this.containerParent);
        const offset = containerOffset.add(localOffset);
        this.element.setAttribute("width", dimensions.x.toString());
        this.element.setAttribute("height", dimensions.y.toString());
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
        if (!State.data.get())
            return false;
        const drawnCache = State.drawnElements.get();
        const canvasOffsetCache = State.canvasOffset.get();
        const mousePos = State.mousePos.get().subtract(canvasOffsetCache);
        let anyHovered = false;
        // check whether any paths are hovered over
        for (let i = 0; i < drawnCache.length; i++) {
            // see if path is hovered over
            const element = drawnCache[i];
            const path = element.path;
            const isHovered = context.isPointInPath(path, ...mousePos.get());
            if (!isHovered)
                continue;
            anyHovered = true;
            // display popup if element is clicked
            const way = State.allWays.get().get(element.wayId);
            if (way === undefined)
                continue;
            if (clicked)
                displaySidebar(element.wayId);
        }
        return anyHovered;
    }
    /**
     * Retrieve the drawing context for this canvas.
     *
     * @returns The drawing context.
     */
    getContext() {
        const context = this.element.getContext("2d");
        if (context === null)
            throw new Error("Context could not be retrieved");
        return context;
    }
}
// canvas instance
export const CANVAS = new Canvas("canvas", "canvas-container", "main");
// canvas effects
new Effect(() => CANVAS.draw());
