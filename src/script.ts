import type {
	OverpassWay,
	OverpassNode,
	ImportedData,
	OverpassRelation,
} from "./index.js";
import {
	coordToScreenSpace,
	degreesToPixels,
	laneLength,
	metresToDegrees,
	screenSpaceToCoord,
} from "./supplement/conversions.js";
import * as draw from "./supplement/drawing.js";
import { roadColours } from "./supplement/drawing.js";
import { Coordinate, zoomIncrement } from "./supplement/index.js";
import { displayMessage } from "./supplement/messages.js";
import { overpassQuery } from "./supplement/overpass.js";
import { Settings } from "./supplement/settings.js";
import {
	zoom,
	multiplier,
	totalMultiplier,
	data,
	mousePos,
	zoomOffset,
	mouseOffset,
	canvasDimensions,
	currentRelationId,
	drawnElements,
	selectedWay,
	canvasOffset,
	allWays,
} from "./supplement/view.js";
import {
	context,
	displayPopup,
	setSearching,
	togglePopup,
} from "./supplement/dom.js";

export const settings = new Settings();

// functions
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

export function centre() {
	mouseOffset.set(new Coordinate());
	zoomOffset.set(new Coordinate());
	zoom.set(0);
}

export async function display(name: string) {
	setSearching();

	const roadName = name;

	if (roadName.length == 0) {
		displayMessage("noSearchTerm");
		setSearching(false);
		return;
	}

	if (roadName.includes('"')) {
		displayMessage("malformedSearchTerm");
		setSearching(false);
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
	const ways: Record<number, OverpassWay> = {};
	const nodes: Record<number, OverpassNode> = {};

	elements.forEach(element => {
		switch (element.type) {
			case "relation":
				relations[element.id] = element;
				break;
			case "way":
				if (Object.keys(element.tags).includes("highway"))
					ways[element.id] = element;
				break;
			case "node":
				nodes[element.id] = element;
				break;
		}
	});
	if (Object.keys(relations).length > 1) {
		displayMessage("multipleRelations");
		setSearching(false);
		return;
	}

	const relation = Object.values(relations)[0];

	if (!relation) {
		displayMessage("noResult");
		setSearching(false);
		return;
	}

	currentRelationId.set(relation.id);
	const wayIdsInRelation: number[] = [];
	relation.members.forEach(member => {
		wayIdsInRelation.push(member.ref);
	});

	const externalWays: string[] = [];
	Object.keys(ways).forEach(wayId => {
		if (!wayIdsInRelation.includes(parseInt(wayId))) {
			externalWays.push(ways[wayId]);
			delete ways[wayId];
		}
	});

	process(ways, nodes);

	centre();

	allWays.set(ways);

	setSearching(false);
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

export async function drawCanvas() {
	// clear canvas from previous drawings
	const dimensions = canvasDimensions.get();
	context.clearRect(0, 0, dimensions.x, dimensions.y);
	drawnElements.set({});

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
				else if (xPos > dimensions.x) allOffScreen[0][i] = "below";
				else allOffScreen[0][i] = "in";

				if (yPos < 0) allOffScreen[1][i] = "above";
				else if (yPos > dimensions.y) allOffScreen[1][i] = "below";
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
					thisSrtCoord.x,
					thisEndCoord.x,
					nextSrtCoord.x,
					nextEndCoord.x,
				];
				const allY = [
					thisSrtCoord.y,
					thisEndCoord.y,
					nextSrtCoord.y,
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

			// centre line
			const trigCoefficient = trigCoord
				.multiply(laneLength)
				.multiply(lanesForward);

			const centreStartCoord = thisTopCornerPos.subtract(trigCoefficient);
			const centreEndCoord = nextTopCornerPos.subtract(trigCoefficient);

			if (!way.oneway)
				draw.line(
					centreStartCoord,
					centreEndCoord,
					degreesToPixels(metresToDegrees(0.5)),
					"white"
				);

			// draw select outline if selected
			const outlined = selectedWay.get() == parseInt(wayId);
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

			drawnElements.setDynamic(old => {
				const key = Object.keys(old).length;
				return {
					...old,
					[key]: { wayId, path },
				};
			});
		}
	}
}

export function hoverPath(click = true) {
	if (!data.get()) return;

	const drawnCache = drawnElements.get();
	const canvasOffsetCache = canvasOffset.get();
	Object.keys(drawnCache).forEach(id => {
		const element: { wayId: string; path: Path2D } = drawnCache[id];
		const way = allWays.get()[element.wayId];
		const path = element.path;
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
	});
	return false;
}

export function openID() {
	window.open(
		`https://www.openstreetmap.org/relation/${currentRelationId.get()}`,
		"_blank",
		"noreferrer noopener"
	);
}

export function editID() {
	window.open(
		`https://www.openstreetmap.org/edit?way=${selectedWay.get()}`,
		"_blank",
		"noreferrer noopener"
	);
}

export function openJOSM() {
	const { minLat, maxLat, minLon, maxLon } = multiplier.get();
	const url = `127.0.0.1:8111/load_and_zoom?left=${minLon}&right=${maxLon}&top=${maxLat}&bottom=${minLat}&select=relation${currentRelationId.get()}`;
	fetch(url);
}

// show first launch popup if first launch
if (settings.get("firstLaunch")) {
	settings.set("firstLaunch", false);
	togglePopup("welcome");
}
