import type {
	OverpassWay,
	OverpassNode,
	ImportedData,
	OverpassRelation,
} from "./index.js";
import {
	FontAwesomeIcon,
	ElementBuilder,
	LinkChip,
} from "./supplement/elements.js";
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
import { SettingName, Settings } from "./supplement/settings.js";
import {
	zoom,
	multiplier,
	totalMultiplier,
	data,
	mousePos,
	zoomOffset,
	mouseOffset,
	mouseDown,
	mouseDownPos,
	mouseMoved,
	canvasDimensions,
	currentRelationId,
	drawnElements,
} from "./supplement/view.js";

export const settings = new Settings();

// functions
function zoomInOut(inOut: "in" | "out", source: "mouse" | "button") {
	const totalMultiplierRaw = Math.sqrt(totalMultiplier.get());

	const mousePosition =
		source == "mouse"
			? new Coordinate(
					mousePos.get().x - canvas.offsetLeft,
					mousePos.get().y - canvas.offsetTop
			  )
			: new Coordinate(canvas.width / 2, canvas.height / 2);

	const mouseCoord = screenSpaceToCoord(mousePosition);

	if (inOut === "in") zoom.setDynamic(old => old + zoomIncrement);
	else if (totalMultiplierRaw - zoomIncrement > 0)
		zoom.setDynamic(old => old - zoomIncrement);

	const newCoord = coordToScreenSpace(mouseCoord);
	const diff = mousePosition.subtract(newCoord);

	zoomOffset.setDynamic(old => old.add(diff));
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

function setSearching(searching = true) {
	while (searchButton.lastChild) searchButton.lastChild.remove();

	const icon = new FontAwesomeIcon("solid");
	if (searching) icon.setIcon("circle-notch").animate("spin");
	else icon.setIcon("magnifying-glass");

	searchButton.append(icon.build());
	settingsButton.disabled = searching;
}

async function display() {
	setSearching();

	const roadName = inputField.value;

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
	Object.keys(allWays).forEach(wayId => {
		if (!wayIdsInRelation.includes(parseInt(wayId))) {
			externalWays.push(allWays[wayId]);
			delete allWays[wayId];
		}
	});

	process(allWays, allNodes);

	centre();

	globalAllWays = allWays;

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
	context.clearRect(0, 0, canvas.width, canvas.height);
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

	while (popup.lastChild) popup.lastChild.remove();

	if (reason != "welcome")
		popup.append(new ElementBuilder("h2").text(reason ?? "").build());

	switch (reason) {
		case "share": {
			const shareText = `${window.location.origin}${
				window.location.pathname
			}#${currentRelationId.get()}`;

			const copyIcon = new FontAwesomeIcon("solid", "copy").build();
			const copyButton = new ElementBuilder("button")
				.id("copy-button")
				.class("copy")
				.children(copyIcon)
				.build();

			const share = new ElementBuilder("span")
				.class("share")
				.text(shareText)
				.build();

			const container = new ElementBuilder("div")
				.id("copy-container")
				.children(share, copyButton)
				.build();

			const iDIcon = new FontAwesomeIcon("solid", "map").build();
			const iDButton = new ElementBuilder("button")
				.id("osm")
				.class("open-with")
				.tooltip("Open in iD")
				.event("click", openiD)
				.children(iDIcon)
				.build();

			const josmIcon = new FontAwesomeIcon("solid", "desktop").build();
			const josmButton = new ElementBuilder("button")
				.id("josm")
				.class("open-with")
				.tooltip("Open in JOSM")
				.event("click", openJOSM)
				.children(josmIcon)
				.build();

			const openWithContainer = new ElementBuilder("div")
				.class("open-with-container")
				.children(iDButton, josmButton)
				.build();

			popup.append(container, openWithContainer);

			copyButton.addEventListener("click", () => {
				navigator.clipboard.writeText(shareText).then(() => {
					copyIcon.classList.remove("fa-copy");
					copyIcon.classList.add("fa-check");
				});
			});

			iDButton.addEventListener("click", () => openiD);
			josmIcon.addEventListener("click", openJOSM);

			break;
		}
		case "settings": {
			const list = new ElementBuilder("div").id("settings-list").build();

			settings.keys().forEach(key => {
				const setting = settings.getFull(key);
				if (!setting.inSettings) return;

				const settingDescription = setting.description;
				const isBoolean = typeof setting.value === "boolean";

				const heading = new ElementBuilder("h3")
					.text(setting.name)
					.build();
				const text = new ElementBuilder("p")
					.text(settingDescription)
					.build();

				const inputBox = new ElementBuilder("input")
					.inputType(isBoolean ? "checkbox" : "text")
					.attribute("data-setting", key)
					.event("change", e => {
						const target = e.target as HTMLInputElement;
						settings.set(
							target.getAttribute("data-setting") as SettingName,
							target.getAttribute("type") == "checkbox"
								? target.checked
								: target.value
						);
					});

				if (typeof setting.value === "boolean")
					inputBox.inputChecked(setting.value);
				else inputBox.inputValue(setting.value);

				const innerDiv = new ElementBuilder("div")
					.class("setting-text")
					.children(heading, text)
					.build();
				const outerDiv = new ElementBuilder("div")
					.class("setting-container")
					.children(innerDiv, inputBox.build())
					.build();

				list.append(outerDiv);
			});

			popup.append(list);

			break;
		}
		case "help": {
			const help = new ElementBuilder("p")
				.text("Coming soon. Stay Tuned.")
				.build();
			popup.append(help);
			break;
		}
		case "about": {
			const description = new ElementBuilder("p")
				.text(
					"Welcome to Merge! This project is still in it's early stages so bugs are missing features are to be expected. If you find any issues that aren't already known, please submit a report to the Github page."
				)
				.build();
			const chip = new LinkChip()
				.url("https://www.github.com/lachlan2357/merge")
				.text("GitHub")
				.icon(new FontAwesomeIcon("brands", "github"))
				.build();

			popup.append(description, chip);
			break;
		}
		case "advanced": {
			const advanced = new ElementBuilder("p")
				.text("Coming soon. Stay Tuned.")
				.build();
			popup.append(advanced);
			break;
		}
		case "welcome": {
			const img = new ElementBuilder("img")
				.id("welcome-img")
				.src("/merge/icon.png")
				.build();

			const heading = new ElementBuilder("h2")
				.id("welcome-heading")
				.text("Merge")
				.build();

			const description = new ElementBuilder("p")
				.text(
					"Welcome to Merge! To get started, use the search box to lookup a relation by either RelationID or name. Note: once each request has successfully returned information, the data is cached and when requested again, it pulls from the cache. To re-request data, toggle the options in settings."
				)
				.build();

			popup.append(img, heading, description);
			break;
		}
	}

	// add close button
	const closeIcon = new FontAwesomeIcon("solid", "xmark").build();
	const closeButton = new ElementBuilder("button")
		.id("popup-close")
		.class("button")
		.children(closeIcon)
		.event("click", () => togglePopup())
		.build();

	popup.append(closeButton);

	setHTMLSizes();
	popup.showModal();
}

function hoverPath(click = true) {
	if (!data.get()) return;

	const drawnCache = drawnElements.get();

	const canvasOffset = new Coordinate(canvas.offsetLeft, canvas.offsetTop);
	let returner = false;
	Object.keys(drawnCache).forEach(id => {
		const element: { wayId: string; path: Path2D } = drawnCache[id];
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
			while (wayInfoTags.lastChild)
				wayInfoTags.removeChild(wayInfoTags.lastChild);

			// create heading row
			const tagHeading = new ElementBuilder("th").text("Tag").build();
			const valueHeading = new ElementBuilder("th").text("Value").build();

			const row = new ElementBuilder("tr")
				.children(tagHeading, valueHeading)
				.build();

			wayInfoTags.append(row);

			// content rows
			Object.entries(way.tags).forEach(([tag, value]) => {
				const tagCell = new ElementBuilder("td")
					.text(tag.toString())
					.build();
				const valueCell = new ElementBuilder("td")
					.text(value.toString())
					.build();
				const tagRow = new ElementBuilder("tr")
					.children(tagCell, valueCell)
					.build();

				wayInfoTags.append(tagRow);
			});

			wayInfo.removeAttribute("hidden");
			selectedWay = way.id;
		}
	});
	return returner;
}

function openiD() {
	window.open(
		`https://www.openstreetmap.org/relation/${currentRelationId.get()}`,
		"_blank",
		"noreferrer noopener"
	);
}

function openJOSM() {
	const { minLat, maxLat, minLon, maxLon } = multiplier.get();
	const url = `127.0.0.1:8111/load_and_zoom?left=${minLon}&right=${maxLon}&top=${maxLat}&bottom=${minLat}&select=relation${currentRelationId.get()}`;
	fetch(url);
}

// interactivity
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
			if (buttonId == "share" && !currentRelationId.get()) {
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

	if (e.deltaY / Math.abs(e.deltaY) == 1) zoomInOut("out", "mouse");
	else zoomInOut("in", "mouse");
});

canvas.addEventListener("mousedown", e => {
	if (!data.get()) return;

	mouseDown.set(true);
	mouseDownPos.set(
		new Coordinate(e.clientX, e.clientY).subtract(mouseOffset.get())
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
			// new Coordinate(
			// 	e.clientX - mouseDownPos.get().x,
			// 	e.clientY - mouseDownPos.get().y
			// )
			new Coordinate(e.clientX, e.clientY).subtract(mouseDownPos.get())
		);
	}

	if (hoverPath(false)) canvas.style.cursor = "pointer";
	else canvas.style.cursor = "move";
});

new ResizeObserver(() =>
	canvasDimensions.set(new Coordinate(canvas.width, canvas.height))
).observe(canvas);

zoomInButton.addEventListener("click", () => zoomInOut("in", "button"));

zoomOutButton.addEventListener("click", () => zoomInOut("out", "button"));

zoomResetButton.addEventListener("click", () => centre());

fullscreenButton.addEventListener("click", () => {
	canvas.toggleAttribute("fullscreen");
	setHTMLSizes();
});

editIniD.addEventListener("click", () => {
	window.open(
		`https://www.openstreetmap.org/edit?way=${selectedWay}`,
		"_blank",
		"noreferrer noopener"
	);
});

editInJOSM.addEventListener("click", openJOSM);

setHTMLSizes();

// show first launch popup if first launch
if (settings.get("firstLaunch")) {
	settings.set("firstLaunch", false);
	togglePopup("welcome");
}
