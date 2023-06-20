import type {
	OverpassWay,
	OverpassNode,
	ImportedData,
	OverpassRelation,
} from "./index.js";
import {
	coordToScreenSpace,
	degreesToPixels,
	metresToDegrees,
} from "./supplement/conversions.js";
import * as draw from "./supplement/drawing.js";
import { Coordinate, zoomIncrement } from "./supplement/index.js";
import { displayMessage } from "./supplement/messages.js";
import { overpassQuery } from "./supplement/overpass.js";
import { SettingName, Settings } from "./supplement/settings.js";
import { Effect } from "./supplement/state.js";
import {
	zoom,
	multiplier,
	offset,
	totalMultiplier,
	data,
	mousePos,
	zoomOffset,
	mouseOffset,
	mouseDown,
	mouseDownPos,
	mouseMoved,
	canvasDimensions,
} from "./supplement/view.js";

export const settings = new Settings();

const roadColours = {
	asphalt: "#222233",
	chipseal: "#555c66",
	paved: "#bab6ac",
	concrete: "#cfc0b9",
	cobblestone: "#ffd6bc",
	paving_stones: "#ab9da4",
	unknown: "#000000",
};

// functions

function zoomInOut(inOut: "in" | "out", source: "mouse" | "button") {
	let totalMultiplierValue = totalMultiplier.get();
	const totalMultiplierRaw = Math.sqrt(totalMultiplierValue);
	let offsetValue = offset.get();

	const mousePosition =
		source == "mouse"
			? new Coordinate(
					mousePos.get().x - canvas.offsetLeft,
					mousePos.get().y - canvas.offsetTop
			  )
			: new Coordinate(canvas.width / 2, canvas.height / 2);

	const mouseCoord = new Coordinate(
		(mousePosition.x - offsetValue.x) / totalMultiplierValue,
		-(mousePosition.y - offsetValue.y) / totalMultiplierValue
	);

	if (inOut === "in") zoom.setDynamic(old => old + zoomIncrement);
	else if (totalMultiplierRaw - zoomIncrement > 0)
		zoom.setDynamic(old => old - zoomIncrement);

	totalMultiplierValue = totalMultiplier.get();
	offsetValue = offset.get();

	const newCoord = coordToScreenSpace(mouseCoord);
	const diff = new Coordinate(
		mousePosition.x - newCoord.x,
		mousePosition.y - newCoord.y
	);

	zoomOffset.setDynamic(
		old => new Coordinate(old.x + diff.x, old.y + diff.y)
	);
}

function centre() {
	mouseOffset.set(new Coordinate());
	zoomOffset.set(new Coordinate());
	zoom.set(0);
}

function setHTMLSizes() {
	canvas.setAttribute("width", `${canvas.clientWidth}px`);
	canvas.setAttribute("height", `${canvas.clientHeight}px`);

	canvasOverlay.style.width = `${canvas.width}px`;
	canvasOverlay.style.top = `${canvas.offsetTop}px`;
	canvasOverlay.style.left = `${canvas.offsetLeft}px`;

	const newHeight = window.innerHeight - canvas.offsetTop - 20;
	document.documentElement.style.setProperty(
		"--canvas-height",
		`${newHeight}px`
	);
	canvas.height = newHeight;

	// setup button offsets for all tooltips
	document.querySelectorAll("[tooltip]").forEach(element => {
		const button = element as HTMLButtonElement;
		const offsetWidth = `${button.children[0].scrollWidth / 2}px`;
		button.style.setProperty("--width", offsetWidth);
	});
}

function setSearchState(state: "normal" | "searching") {
	while (searchButton.lastChild) searchButton.lastChild.remove();

	switch (state) {
		case "normal":
			searchButton.append(fontAwesomeIcon("solid", "magnifying-glass"));
			searchButton.setAttribute("tooltip", "Search");
			settingsButton.disabled = false;
			break;
		case "searching":
			searchButton.setAttribute("tooltip", "Loading...");
			searchButton.append(
				fontAwesomeIcon("solid", "circle-notch", "spin")
			);
			settingsButton.disabled = true;
			break;
	}
}

async function display() {
	setSearchState("searching");

	const roadName = inputField.value;

	if (roadName.length == 0) {
		displayMessage("noSearchTerm");
		setSearchState("normal");
		return;
	}

	if (roadName.includes('"')) {
		displayMessage("malformedSearchTerm");
		setSearchState("normal");
		return;
	}

	const searchMode = isNaN(parseInt(roadName))
		? `<has-kv k="name" v="${roadName}"/>`
		: `<id-query type="relation" ref="${roadName}"/>`;

	const query = await overpassQuery(
		`<osm-script output="json"><union><query type="relation">${searchMode}</query><recurse type="relation-way"/><recurse type="way-node"/><recurse type="node-way"/></union><print/></osm-script>`
	);

	const elements = query.elements;

	const relations: Record<number, OverpassRelation> = {};
	const allWays: Record<number, OverpassWay> = {};
	const allNodes: Record<number, OverpassNode> = {};

	elements.forEach(element => {
		switch (element.type) {
			case "relation":
				relations[element.id] = element;
				break;
			case "way":
				if (Object.keys(element.tags).includes("highway"))
					allWays[element.id] = element;
				break;
			case "node":
				allNodes[element.id] = element;
				break;
		}
	});
	if (Object.keys(relations).length > 1) {
		displayMessage("multipleRelations");
		setSearchState("normal");
		return;
	}

	const relation = Object.values(relations)[0];

	if (!relation) {
		displayMessage("noResult");
		setSearchState("normal");
		return;
	}

	currentRelationId = relation.id;
	const wayIdsInRelation: number[] = [];
	relation.members.forEach(member => {
		wayIdsInRelation.push(member.ref);
	});

	const externalWays: string[] = [];
	Object.keys(allWays).forEach(wayId => {
		if (!wayIdsInRelation.includes(parseInt(wayId))) {
			externalWays.push(allWays[wayId]);
			delete allWays[wayId];
		}
	});

	process(allWays, allNodes);

	centre();

	globalAllWays = allWays;

	window.location.hash = `#${currentRelationId}`;

	setSearchState("normal");
}

function process(
	allWays: Record<number, OverpassWay>,
	allNodes: Record<number, OverpassNode>
) {
	const waysInfo: {
		[key: number]: {
			"nodes": {
				id: number;
				lat: number;
				lon: number;
			};
			"orderedNodes": number[];
			"oneway": boolean;
			"lanes": number | null;
			"lanes:forward": number | null;
			"lanes:backward": number | null;
			"turn:lanes": string | null;
			"turn:lanes:forward": string | null;
			"turn:lanes:backward": string | null;
			"warnings": string[];
		};
	} = {};

	// loop through each way and store information about it
	Object.keys(allWays).forEach(wayId => {
		const way: OverpassWay = allWays[wayId];
		waysInfo[wayId] = {
			"nodes": {},
			"orderedNodes": [],
			"oneway": false,
			"junction": null,
			"lanes": 0,
			"lanes:forward": 0,
			"lanes:backward": 0,
			"turn:lanes": null,
			"turn:lanes:forward": null,
			"turn:lanes:backward": null,
			"surface": null,
			"warnings": [],
		};

		allWays[wayId].nodes.forEach(nodeId => {
			waysInfo[wayId].nodes[nodeId] = {
				id: nodeId,
				lat: allNodes[nodeId].lat,
				lon: allNodes[nodeId].lon,
			};

			waysInfo[wayId].orderedNodes.push(nodeId);
		});

		// set junction
		waysInfo[wayId].junction = Object.keys(way.tags).includes("junction")
			? way.tags.junction
			: null;

		// set oneway
		waysInfo[wayId].oneway =
			(Object.keys(way.tags).includes("oneway") &&
				way.tags.oneway == "yes") ||
			(Object.keys(way.tags).includes("junction") &&
				way.tags.junction == "roundabout")
				? true
				: false;

		// set lanes to specified value
		waysInfo[wayId].lanes = Object.keys(way.tags).includes("lanes")
			? way.tags.lanes
			: null;

		// set lanes:forward to specified value
		waysInfo[wayId]["lanes:forward"] = Object.keys(way.tags).includes(
			"lanes:forward"
		)
			? way.tags["lanes:forward"]
			: null;

		// set lanes:backward to specified value
		waysInfo[wayId]["lanes:backward"] = Object.keys(way.tags).includes(
			"lanes:backward"
		)
			? way.tags["lanes:backward"]
			: null;

		// set turn:lanes:forward to specified value, or default if not
		waysInfo[wayId]["turn:lanes:forward"] = Object.keys(way.tags).includes(
			"turn:lanes:forward"
		)
			? way.tags["turn:lanes:forward"]
			: null;

		// set turn:lanes:backward to specified value, or default if not
		waysInfo[wayId]["turn:lanes:backward"] = Object.keys(way.tags).includes(
			"turn:lanes:backward"
		)
			? way.tags["turn:lanes:backward"]
			: null;

		// set surface to specified value, or unknown if not
		waysInfo[wayId]["surface"] = Object.keys(way.tags).includes("surface")
			? way.tags["surface"]
			: "unknown";

		// loop through the following data that could be inferred until no more changes can be made
		let noChanges = false;
		while (!noChanges) {
			noChanges = true;

			// fill in lanes if isn't specified, but can be inferred from other values
			if (
				waysInfo[wayId].lanes == null &&
				waysInfo[wayId]["lanes:forward"] != null &&
				waysInfo[wayId]["lanes:backward"] != null
			) {
				waysInfo[wayId].lanes =
					(parseInt(waysInfo[wayId]["lanes:forward"]) || 0) +
					(parseInt(waysInfo[wayId]["lanes:backward"]) || 0);
				noChanges = false;
			}

			// fill in lanes:forward if isn't specified, but can be inferred from other values
			if (
				waysInfo[wayId]["lanes:forward"] == null &&
				waysInfo[wayId].lanes != null &&
				waysInfo[wayId]["lanes:backward"] != null
			) {
				waysInfo[wayId]["lanes:forward"] =
					(waysInfo[wayId].lanes || 0) -
					(waysInfo[wayId]["lanes:backward"] || 0);
				noChanges = false;
			} else if (
				waysInfo[wayId]["lanes:forward"] == null &&
				waysInfo[wayId].lanes != null &&
				waysInfo[wayId].oneway
			) {
				waysInfo[wayId]["lanes:forward"] = waysInfo[wayId].lanes;
				noChanges = false;
			} else if (
				waysInfo[wayId]["lanes:forward"] == null &&
				!waysInfo[wayId].oneway &&
				waysInfo[wayId].lanes != null &&
				(waysInfo[wayId].lanes || 0) % 2 == 0
			) {
				waysInfo[wayId]["lanes:forward"] =
					(waysInfo[wayId].lanes || 0) / 2;
			}

			// fill in lanes:backward if isn't specified, but can be inferred from other values
			if (
				waysInfo[wayId]["lanes:backward"] == null &&
				waysInfo[wayId].lanes != null &&
				waysInfo[wayId]["lanes:forward"] != null
			) {
				waysInfo[wayId]["lanes:backward"] =
					(waysInfo[wayId].lanes || 0) -
					(waysInfo[wayId]["lanes:forward"] || 0);
				noChanges = false;
			} else if (
				waysInfo[wayId]["lanes:backward"] == null &&
				waysInfo[wayId].lanes != null &&
				waysInfo[wayId].oneway
			) {
				waysInfo[wayId]["lanes:backward"] = 0;
				noChanges = false;
			} else if (
				waysInfo[wayId]["lanes:backward"] == null &&
				!waysInfo[wayId].oneway &&
				waysInfo[wayId].lanes != null &&
				(waysInfo[wayId].lanes || 0) % 2 == 0
			) {
				waysInfo[wayId]["lanes:backward"] =
					(waysInfo[wayId].lanes || 0) / 2;
				noChanges = false;
			}

			// fill in turn:lanes:forward if isn't specified, but can be inferred from other values
			if (
				waysInfo[wayId]["turn:lanes:forward"] == null &&
				waysInfo[wayId].oneway &&
				Object.keys(way.tags).includes("turn:lanes") &&
				way.tags["turn:lanes"] != null
			) {
				waysInfo[wayId]["turn:lanes:forward"] = way.tags["turn:lanes"];
				noChanges = false;
			} else if (
				waysInfo[wayId]["turn:lanes:forward"] == null &&
				waysInfo[wayId]["lanes:forward"] != null
			) {
				waysInfo[wayId]["turn:lanes:forward"] =
					"none|"
						.repeat(waysInfo[wayId]["lanes:forward"] || 0)
						.slice(0, -1) || null;
				noChanges = false;
			}

			// fill in turn:lanes:backward if isn't specified, but can be inferred from other values
			if (
				waysInfo[wayId]["turn:lanes:backward"] == null &&
				waysInfo[wayId]["lanes:backward"] != null
			) {
				waysInfo[wayId]["turn:lanes:backward"] =
					"none|"
						.repeat(waysInfo[wayId]["lanes:backward"] || 0)
						.slice(0, -1) || null;
			}
		}

		// replace all the "|" with "none|" in turn lanes
		if (waysInfo[wayId]["turn:lanes:forward"] != null) {
			const turnLanesForward: string[] = (
				waysInfo[wayId]["turn:lanes:forward"] || "none"
			).split("|");
			let turnLanesForwardString = "";

			for (let i = 0; i < turnLanesForward.length; i++) {
				const marking = turnLanesForward[i] || "none";
				turnLanesForwardString += `${marking}|`;
			}

			turnLanesForwardString = turnLanesForwardString.substring(
				0,
				turnLanesForwardString.length - 1
			);

			waysInfo[wayId]["turn:lanes:forward"] = turnLanesForwardString;
		}

		if (waysInfo[wayId]["turn:lanes:backward"] != null) {
			const turnLanesBackward: string[] = (
				waysInfo[wayId]["turn:lanes:backward"] || "none"
			).split("|");
			let turnLanesBackwardString = "";

			for (let i = 0; i < turnLanesBackward.length; i++) {
				const marking = turnLanesBackward[i] || "none";
				turnLanesBackwardString += `${marking}|`;
			}

			turnLanesBackwardString = turnLanesBackwardString.substring(
				0,
				turnLanesBackwardString.length - 1
			);

			waysInfo[wayId]["turn:lanes:backward"] = turnLanesBackwardString;
		}

		// add a "none" to the end of strings with a | at the end
		if (
			waysInfo[wayId]["turn:lanes:backward"] != null &&
			waysInfo[wayId]["turn:lanes:backward"].slice(-1) == "|"
		) {
			waysInfo[wayId]["turn:lanes:backward"] += "none";
		}

		if (
			waysInfo[wayId]["turn:lanes:forward"] != null &&
			waysInfo[wayId]["turn:lanes:forward"].slice(-1) == "|"
		) {
			waysInfo[wayId]["turn:lanes:forward"] += "none";
		}
	});

	const convertedData: ImportedData = {};

	Object.keys(waysInfo).forEach(wayId => {
		const way: {
			"nodes": {
				[key: number]: {
					id: number;
					lat: number;
					lon: number;
				};
			};
			"orderedNodes": number[];
			"oneway": boolean;
			"lanes": number | null;
			"lanes:forward": number | null;
			"lanes:backward": number | null;
			"turn:lanes": string | null;
			"turn:lanes:forward": string | null;
			"turn:lanes:backward": string | null;
			"warnings": number[];
		} = waysInfo[wayId];

		convertedData[wayId] = {
			"nodes": {},
			"orderedNodes": way.orderedNodes,
			"oneway": way.oneway,
			"lanes": way.lanes,
			"lanes:forward": way["lanes:forward"],
			"lanes:backward": way["lanes:backward"],
			"turn:lanes:forward": way["turn:lanes:forward"] || "none",
			"turn:lanes:backward": way["turn:lanes:backward"] || "none",
			"surface": way["surface"] || "unknown",
			"warnings": way.warnings,
		};

		Object.keys(way.nodes).forEach(nodeId => {
			const node = allNodes[nodeId];
			convertedData[wayId].nodes[node.id] = {
				id: node.id,
				lat: node.lat,
				lon: node.lon,
			};
		});
	});

	data.set(convertedData);
}

async function drawCanvas() {
	// clear canvas from previous drawings
	context.clearRect(0, 0, canvas.width, canvas.height);
	drawnElements = [];

	// if no data, return
	const dataCache = data.get();
	if (!dataCache) return;
	else document.getElementById("empty-message")?.remove();

	// reset ignoreCache
	settings.set("ignoreCache", false);

	// for way in data
	for (const wayId in dataCache) {
		const way = dataCache[wayId];
		const lanes = way.lanes || 2;
		for (const key in way.orderedNodes) {
			const nextKey = (parseInt(key) + 1).toString();

			if (parseInt(nextKey) == way.orderedNodes.length) continue;

			const thisNodeId = way.orderedNodes[key];
			const nextNodeId = way.orderedNodes[nextKey];

			const thisNode = way.nodes[thisNodeId];
			const nextNode = way.nodes[nextNodeId];

			// points along the way
			const x1 = thisNode.lon;
			const y1 = thisNode.lat;
			const x2 = nextNode.lon;
			const y2 = nextNode.lat;

			const thisPos = new Coordinate(x1, y1);
			const nextPos = new Coordinate(x2, y2);

			// angles are the atan of the gradient, however gradients doesn't tell direction. the condition checks if the configuration of points leads to a 'flipped' gradient
			const gradient = (y2 - y1) / (x2 - x1);
			const angle =
				(y1 > y2 && x1 > x2) || (y1 < y2 && x1 > x2)
					? Math.atan(gradient) + Math.PI
					: Math.atan(gradient);
			const adjacentAngle = angle + Math.PI / 2;

			// define the four corners of the box around the way
			const thisTopCornerPos = new Coordinate(
				x1 + Math.cos(adjacentAngle) * laneLength * (lanes / 2),
				y1 + Math.sin(adjacentAngle) * laneLength * (lanes / 2)
			);
			const thisBtmCornerPos = new Coordinate(
				x1 - Math.cos(adjacentAngle) * laneLength * (lanes / 2),
				y1 - Math.sin(adjacentAngle) * laneLength * (lanes / 2)
			);
			const nextTopCornerPos = new Coordinate(
				x2 + Math.cos(adjacentAngle) * laneLength * (lanes / 2),
				y2 + Math.sin(adjacentAngle) * laneLength * (lanes / 2)
			);
			const nextBtmCornerPos = new Coordinate(
				x2 - Math.cos(adjacentAngle) * laneLength * (lanes / 2),
				y2 - Math.sin(adjacentAngle) * laneLength * (lanes / 2)
			);

			const allPos = [
				[
					thisPos.x,
					nextPos.x,
					thisTopCornerPos.x,
					thisBtmCornerPos.x,
					nextTopCornerPos.x,
					nextBtmCornerPos.x,
				],
				[
					thisPos.y,
					nextPos.y,
					thisTopCornerPos.y,
					thisBtmCornerPos.y,
					nextTopCornerPos.y,
					nextBtmCornerPos.y,
				],
			];
			const allOffScreen: ("above" | "in" | "below" | "unknown")[][] = [
				[
					"unknown",
					"unknown",
					"unknown",
					"unknown",
					"unknown",
					"unknown",
				],
				[
					"unknown",
					"unknown",
					"unknown",
					"unknown",
					"unknown",
					"unknown",
				],
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
				else if (xPos > canvas.width) allOffScreen[0][i] = "below";
				else allOffScreen[0][i] = "in";

				if (yPos < 0) allOffScreen[1][i] = "above";
				else if (yPos > canvas.height) allOffScreen[1][i] = "below";
				else allOffScreen[1][i] = "in";
			}

			// see if all x and y values are in the same 'place' and display box accordingly
			const allXEqual = allOffScreen[0].every(
				(val, i, arr) => val === arr[0]
			);
			const allYEqual = allOffScreen[1].every(
				(val, i, arr) => val === arr[0]
			);
			if (
				(allXEqual && allOffScreen[0][0] != "in") ||
				(allYEqual && allOffScreen[1][0] != "in")
			)
				continue;

			const lanesForward =
				way["lanes:forward"] || (way.oneway ? lanes : lanes / 2);
			const lanesBackward =
				way["lanes:backward"] || (way.oneway ? 0 : lanes / 2);
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
							way.surface || "unknown"
						)
							? way.surface || "unknown"
							: "unknown"
					];
				const thisStartCoord = new Coordinate(
					thisTopCornerPos.x -
						Math.cos(adjacentAngle) * laneLength * i,
					thisTopCornerPos.y -
						Math.sin(adjacentAngle) * laneLength * i
				);
				const thisEndCoord = new Coordinate(
					nextTopCornerPos.x -
						Math.cos(adjacentAngle) * laneLength * i,
					nextTopCornerPos.y -
						Math.sin(adjacentAngle) * laneLength * i
				);
				const nextStartCoord = new Coordinate(
					thisTopCornerPos.x -
						Math.cos(adjacentAngle) * laneLength * (i + 1),
					thisTopCornerPos.y -
						Math.sin(adjacentAngle) * laneLength * (i + 1)
				);
				const nextEndCoord = new Coordinate(
					nextTopCornerPos.x -
						Math.cos(adjacentAngle) * laneLength * (i + 1),
					nextTopCornerPos.y -
						Math.sin(adjacentAngle) * laneLength * (i + 1)
				);
				draw.polygon(
					[
						thisStartCoord,
						thisEndCoord,
						nextEndCoord,
						nextStartCoord,
					],
					degreesToPixels(metresToDegrees(0.15)),
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
					thisStartCoord.x,
					thisEndCoord.x,
					nextStartCoord.x,
					nextEndCoord.x,
				];
				const allY = [
					thisStartCoord.y,
					thisEndCoord.y,
					nextStartCoord.y,
					nextEndCoord.y,
				];

				const maxCoord = new Coordinate(
					Math.max(...allX),
					Math.max(...allY)
				);
				const minCoord = new Coordinate(
					Math.min(...allX),
					Math.min(...allY)
				);

				// along with finding the length and width, adjust them to be negative if it is a backwards lane
				const centre = new Coordinate(
					(maxCoord.x + minCoord.x) / 2,
					(maxCoord.y + minCoord.y) / 2
				);
				const length =
					Math.sqrt(
						(thisStartCoord.x - thisEndCoord.x) ** 2 +
							(thisStartCoord.y - thisEndCoord.y) ** 2
					) * (i < lanesForward ? directionality : -directionality);
				const width =
					Math.sqrt(
						(thisStartCoord.x - nextStartCoord.x) ** 2 +
							(thisStartCoord.y - nextStartCoord.y) ** 2
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

			// centre line
			const centreStartCoord = new Coordinate(
				thisTopCornerPos.x -
					Math.cos(adjacentAngle) * laneLength * lanesForward,
				thisTopCornerPos.y -
					Math.sin(adjacentAngle) * laneLength * lanesForward
			);
			const centreEndCoord = new Coordinate(
				nextTopCornerPos.x -
					Math.cos(adjacentAngle) * laneLength * lanesForward,
				nextTopCornerPos.y -
					Math.sin(adjacentAngle) * laneLength * lanesForward
			);
			if (!way.oneway)
				draw.line(
					centreStartCoord,
					centreEndCoord,
					degreesToPixels(metresToDegrees(0.5)),
					"white"
				);

			// draw select outline if selected
			const outlined = selectedWay == parseInt(wayId);
			const path = draw.polygon(
				[
					thisBtmCornerPos,
					thisTopCornerPos,
					nextTopCornerPos,
					nextBtmCornerPos,
				],
				outlined ? 5 : 1,
				outlined ? "lightblue" : "#222233"
			);

			drawnElements[Object.keys(drawnElements).length] = {
				wayId: wayId,
				path: path,
			};
		}
	}
}

type elementType =
	| "h1"
	| "h2"
	| "h3"
	| "h4"
	| "h5"
	| "h6"
	| "p"
	| "div"
	| "span"
	| "button"
	| "input"
	| "img";

function element(
	type: elementType,
	options?: {
		textContent?: string;
		id?: string;
		classList?: string[];
		tooltip?: string;
		type?: string;
		src?: string;
		attributes?: { [key: string]: string };
	}
) {
	const element = document.createElement(type);

	if (!options) return element;

	if (options.textContent) element.textContent = options.textContent;
	if (options.id) element.id = options.id;
	if (options.classList) element.classList.add(...options.classList);
	if (options.tooltip) element.setAttribute("data-tooltip", options.tooltip);
	if (options.type) element.setAttribute("type", options.type);
	if (options.src) element.setAttribute("src", options.src);
	if (options.attributes)
		Object.keys(options.attributes).forEach(key => {
			element.setAttribute(key, options.attributes?.[key] ?? "");
		});

	return element;
}

function fontAwesomeIcon(
	style: "solid" | string,
	icon: string,
	animation?: "spin" | string
) {
	const element = document.createElement("i");
	element.classList.add(...[`fa-${style}`, `fa-${icon}`]);
	if (animation) element.classList.add(`fa-${animation}`);
	return element;
}

async function togglePopup(
	reason?: "share" | "settings" | "help" | "about" | "welcome" | string
) {
	if (popup.open) {
		popup.setAttribute("closing", "");
		popup.addEventListener(
			"animationend",
			() => {
				popup.removeAttribute("closing");
				popup.close();
			},
			{ once: true }
		);
		return;
	}

	while (popup.lastChild) {
		popup.lastChild.remove();
	}

	if (reason != "welcome")
		popup.append(element("h2", { textContent: reason }));

	switch (reason) {
		case "share": {
			const copyContainer = element("div", { id: "copy-container" });
			const shareSpan = element("span", {
				classList: ["share"],
				textContent: `${window.location.origin}${window.location.pathname}#${currentRelationId}`,
			});
			const copyButton = element("button", {
				id: "copy-button",
				classList: ["copy"],
			});
			const copyIcon = fontAwesomeIcon("solid", "copy");
			const openWithContainer = element("div", {
				classList: ["open-with-container"],
			});
			const openiDButton = element("button", {
				id: "osm",
				classList: ["open-with"],
				tooltip: "Open in iD",
			});
			const openiDIcon = fontAwesomeIcon("solid", "map");
			const openJosmButton = element("button", {
				id: "josm",
				classList: ["open-with"],
				tooltip: "Open in JOSM",
			});
			const openJosmIcon = fontAwesomeIcon("solid", "desktop");

			openJosmButton.append(openJosmIcon);
			openiDButton.append(openiDIcon);
			openWithContainer.append(openiDButton, openJosmButton);
			copyButton.append(copyIcon);
			copyContainer.append(shareSpan, copyButton);

			popup.append(copyContainer, openWithContainer);

			copyButton.addEventListener("click", () => {
				navigator.clipboard
					.writeText(
						`${window.location.origin}${window.location.pathname}#${currentRelationId}`
					)
					.then(() => {
						copyButton.children[0].classList.remove("fa-copy");
						copyButton.children[0].classList.add("fa-check");
					});
			});

			const { minLat, maxLat, minLon, maxLon } = multiplier.get();

			openiDButton.addEventListener("click", () => {
				window.open(
					`https://www.openstreetmap.org/relation/${currentRelationId}`,
					"_blank",
					"noreferrer noopener"
				);
			});
			openJosmIcon.addEventListener("click", () => {
				openJOSM(
					`http://127.0.0.1:8111/load_and_zoom?left=${minLon}&right=${maxLon}&top=${maxLat}&bottom=${minLat}&select=relation${currentRelationId}`
				);
			});

			break;
		}
		case "settings": {
			const settingsList = element("div", { id: "settings-list" });

			popup.append(settingsList);

			settings.keys().forEach(key => {
				const setting = settings.getFull(key);
				if (!setting.inSettings) return;

				const settingDescription = setting.description;
				const isBoolean = typeof setting.value === "boolean";

				const outerDiv = element("div", {
					classList: ["setting-container"],
				});
				const innerDiv = element("div", {
					classList: ["setting-text"],
				});
				const heading = element("h3", { textContent: setting.name });
				const text = element("p", { textContent: settingDescription });
				const inputBox = element("input", {
					type: isBoolean ? "checkbox" : "text",
					attributes: { "data-setting": key },
				}) as HTMLInputElement;

				if (typeof setting.value === "boolean")
					inputBox.checked = setting.value;
				else inputBox.value = setting.value;

				innerDiv.append(heading, text);
				outerDiv.append(innerDiv, inputBox);
				settingsList.append(outerDiv);

				inputBox.addEventListener("change", (e: Event) => {
					const target: HTMLInputElement =
						e.target as HTMLInputElement;
					settings.set(
						target.getAttribute("data-setting") as SettingName,
						target.getAttribute("type") == "checkbox"
							? target.checked
							: target.value
					);
				});
			});
			break;
		}
		case "help": {
			const tempHelp = element("p", {
				textContent: "Coming soon. Stay Tuned.",
			});
			popup.append(tempHelp);
			break;
		}
		case "about": {
			const description = element("p", {
				textContent:
					"Welcome to Merge! This project is still in it's early stages so bugs are missing features are to be expected. If you find any issues that aren't already known, please submit a report to the Github page.",
			});
			const githubDiv = element("div", { id: "githubDiv" });
			const githubIcon = fontAwesomeIcon("brands", "github");
			const githubLabel = element("p", { textContent: "Github" });
			githubDiv.append(...[githubIcon, githubLabel]);
			popup.append(...[description, githubDiv]);
			githubDiv.addEventListener("click", () =>
				window.open(
					"https://www.github.com/lachlan2357/merge",
					"_blank",
					"noreferrer noopener"
				)
			);
			break;
		}
		case "advanced": {
			const tempAdvanced = element("p", {
				textContent: "Coming soon. Stay Tuned.",
			});
			popup.append(tempAdvanced);
			break;
		}
		case "welcome": {
			const img = element("img", {
				id: "welcome-img",
				src: "/merge/icon.png",
			});
			const heading = element("h2", {
				id: "welcome-heading",
				textContent: "Merge",
			});
			const desc = element("p", {
				textContent:
					"Welcome to Merge! To get started, use the search box to lookup a relation by either RelationID or name. Note: once each request has successfully returned information, the data is cached and when requested again, it pulls from the cache. To re-request data, toggle the options in settings.",
			});

			popup.append(...[img, heading, desc]);
			break;
		}
	}

	// add close button
	const popupCloseButton = document.createElement("button");
	popupCloseButton.id = "popup-close";
	popupCloseButton.classList.add("button");
	const xMark = document.createElement("i");
	xMark.classList.add(...["fa-solid", "fa-xmark"]);
	popupCloseButton.appendChild(xMark);
	popup.appendChild(popupCloseButton);
	const popupClose = document.getElementById(
		"popup-close"
	) as HTMLButtonElement;
	popupClose.addEventListener("click", () => {
		togglePopup();
	});

	setHTMLSizes();
	popup.showModal();
}

function hoverPath(click = true) {
	if (!data.get()) return;
	const canvasOffset = new Coordinate(canvas.offsetLeft, canvas.offsetTop);
	let returner = false;
	Object.keys(drawnElements).forEach(id => {
		const element: { wayId: string; path: Path2D } = drawnElements[id];
		const way: OverpassWay = globalAllWays[element.wayId];
		const path = element.path;
		if (
			context.isPointInPath(
				path,
				mousePos.get().x - canvasOffset.x,
				mousePos.get().y - canvasOffset.y
			)
		) {
			returner = true;
			if (!click) return;
			wayInfoId.innerHTML = `Way <a href="https://www.openstreetmap.org/way/${element.wayId}" target="_blank">${element.wayId}</a>`;
			// purge all children before adding new ones
			while (wayInfoTags.lastChild) {
				wayInfoTags.removeChild(wayInfoTags.lastChild);
			}

			// heading row
			const trh = document.createElement("tr");
			const thNameHeading = document.createElement("th");
			const thValueHeading = document.createElement("th");
			thNameHeading.textContent = "Tag";
			thValueHeading.textContent = "Value";
			trh.append(...[thNameHeading, thValueHeading]);
			wayInfoTags.append(trh);

			// content rows
			Object.keys(way.tags).forEach(tag => {
				const tr = document.createElement("tr");
				const tdName = document.createElement("td");
				const tdValue = document.createElement("td");
				tdName.textContent = tag;
				tdValue.textContent = way.tags[tag];
				tr.append(...[tdName, tdValue]);
				wayInfoTags.append(tr);
			});

			wayInfo.removeAttribute("hidden");
			selectedWay = way.id;
		}
	});
	return returner;
}

function openJOSM(query: string) {
	const req = new XMLHttpRequest();
	req.open("GET", query);
	req.send();
}

// overpass data
// export let data: ImportedData;
export let currentRelationId: number;

// interactivity
let drawnElements: {
	[key: number]: {
		wayId: string;
		path: Path2D;
	};
};
let globalAllWays: Record<number, OverpassWay>;
let selectedWay: number;

// reference html elements
export const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const canvasOverlay = document.getElementById(
	"canvas-overlay"
) as HTMLDivElement;
const inputField = document.getElementById("relation-name") as HTMLInputElement;
const searchButton = document.getElementById("search") as HTMLButtonElement;
const advancedButton = document.getElementById("advanced") as HTMLButtonElement;
const settingsButton = document.getElementById("settings") as HTMLButtonElement;
const zoomInButton = document.getElementById("zoom-in") as HTMLButtonElement;
const zoomOutButton = document.getElementById("zoom-out") as HTMLButtonElement;
const zoomResetButton = document.getElementById(
	"zoom-reset"
) as HTMLButtonElement;
const fullscreenButton = document.getElementById(
	"fullscreen"
) as HTMLButtonElement;
const shareButton = document.getElementById("share") as HTMLButtonElement;
const helpButton = document.getElementById("help") as HTMLButtonElement;
const aboutButton = document.getElementById("about") as HTMLButtonElement;
const popup = document.getElementById("popup") as HTMLDialogElement;
export const messages = document.getElementById("messages") as HTMLDivElement;
const wayInfo = document.getElementById("way-info") as HTMLHeadingElement;
const wayInfoId = document.getElementById("wayid") as HTMLHeadingElement;
const wayInfoTags = document.getElementById("tags") as HTMLTableElement;
const editIniD = document.getElementById("edit-id") as HTMLButtonElement;
const editInJOSM = document.getElementById("edit-josm") as HTMLButtonElement;
const searchForm = document.getElementById("search-form") as HTMLFormElement;

// setup canvas
export const context = canvas.getContext("2d") as CanvasRenderingContext2D;

// popup button events
[shareButton, settingsButton, advancedButton, helpButton, aboutButton].forEach(
	button => {
		button.addEventListener("click", e => {
			const buttonId = (e.target as HTMLButtonElement).id;
			if (buttonId == "share" && !currentRelationId) {
				displayMessage("emptyShare");
			} else {
				togglePopup(buttonId);
			}
		});
	}
);

window.addEventListener("resize", () => {
	setHTMLSizes();
});

searchForm.addEventListener("submit", e => {
	e.preventDefault();
	display();
});

// canvas mouse controls
canvas.addEventListener("wheel", e => {
	e.preventDefault();

	if (!data.get()) return;

	if (e.deltaY / Math.abs(e.deltaY) == 1) {
		zoomInOut("out", "mouse");
	} else {
		zoomInOut("in", "mouse");
	}
});

canvas.addEventListener("mousedown", e => {
	if (!data.get()) return;

	mouseDown.set(true);
	mouseDownPos.set(
		new Coordinate(
			e.clientX - mouseOffset.get().x,
			e.clientY - mouseOffset.get().y
		)
	);
	mouseMoved.set(false);
});

canvas.addEventListener("mouseup", e => {
	e.preventDefault();

	if (!data.get()) return;

	if (!mouseMoved.get()) {
		if (!hoverPath()) {
			wayInfo.setAttribute("hidden", "");
			selectedWay = -1;
		}
	}

	mouseDown.set(false);

	mouseMoved.set(false);
});

canvas.addEventListener("mousemove", e => {
	e.preventDefault();

	if (!data.get()) return;

	mousePos.set(new Coordinate(e.clientX, e.clientY));
	mouseMoved.set(true);

	if (mouseDown.get()) {
		mouseOffset.set(
			new Coordinate(
				e.clientX - mouseDownPos.get().x,
				e.clientY - mouseDownPos.get().y
			)
		);
	}

	if (hoverPath(false)) {
		canvas.style.cursor = "pointer";
	} else {
		canvas.style.cursor = "move";
	}
});

new ResizeObserver(() =>
	canvasDimensions.set(new Coordinate(canvas.width, canvas.height))
).observe(canvas);

zoomInButton.addEventListener("click", () => {
	zoomInOut("in", "button");
});

zoomOutButton.addEventListener("click", () => {
	zoomInOut("out", "button");
});

zoomResetButton.addEventListener("click", () => {
	setHTMLSizes();
	centre();
});

fullscreenButton.addEventListener("click", () => {
	canvas.setAttribute(
		"fullscreen",
		canvas.getAttribute("fullscreen") == "true" ? "false" : "true"
	);
	setHTMLSizes();
});

const { minLat, maxLat, minLon, maxLon } = multiplier.get();

editIniD.addEventListener("click", () => {
	window.open(
		`https://www.openstreetmap.org/edit?way=${selectedWay}`,
		"_blank",
		"noreferrer noopener"
	);
});

editInJOSM.addEventListener("click", () => {
	openJOSM(
		`http://127.0.0.1:8111/load_and_zoom?left=${minLon}&right=${maxLon}&top=${maxLat}&bottom=${minLat}&select=way${selectedWay}`
	);
});

// set default lane width & length
const laneWidth = 3.5;
const laneLength = metresToDegrees(laneWidth);

// size canvas, show opening message and set settings values
setHTMLSizes();
settings.saveAll();

// show first launch popup if first launch
if (settings.get("firstLaunch")) {
	settings.set("firstLaunch", false);
	togglePopup("welcome");
}

new Effect(() => {
	console.log("draw canvas");
	drawCanvas();
}, [
	data,
	canvasDimensions,
	mousePos,
	mouseDownPos,
	mouseOffset,
	zoomOffset,
	mouseDown,
	mouseMoved,
	zoom,
]);
