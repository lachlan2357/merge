"use strict";
// classes
class coordinate {
    constructor(x = 0, y = 0) {
        [this.x, this.y] = [x, y];
    }
    setCoordinates(x, y) {
        [this.x, this.y] = [x == undefined ? this.x : x, y == undefined ? this.y : y];
    }
    reset() {
        [this.x, this.y] = [0, 0];
    }
}
class node {
    constructor(id, lat, lon) {
        [this.id, this.lat, this.lon] = [id, lat, lon];
    }
}
// global variables
const settings = {
    "Left Hand Traffic": {
        description: "Switch to driving on the left for countries such as the UK, Australia, Japan, etc.",
        inputType: "boolean",
        value: false,
        setLocalStorage: true,
        inSettings: true
    },
    "Endpoint": {
        description: "Use a different Overpass endpoint. Default endpoint is https://overpass-api.de/api/interpreter.",
        inputType: "string",
        value: "https://overpass-api.de/api/interpreter",
        setLocalStorage: true,
        inSettings: true
    },
    "Ignore Cache": {
        description: "Don't used cached data. Must be toggled on for each request.",
        inputType: "boolean",
        value: false,
        setLocalStorage: false,
        inSettings: true
    },
    "Dark Mode": {
        description: "Not light mode.",
        inputType: "boolean",
        value: window.matchMedia("(prefers-color-scheme:dark)").matches,
        setLocalStorage: true,
        inSettings: true
    },
    "First Launch": {
        description: "First time using the application",
        inputType: "boolean",
        value: true,
        setLocalStorage: true,
        inSettings: false
    }
};
const roadColours = {
    "asphalt": "#222233",
    "chipseal": "#555c66",
    "paved": "#bab6ac",
    "concrete": "#cfc0b9",
    "cobblestone": "#ffd6bc",
    "paving_stones": "#ab9da4",
    "unknown": "#000000"
};
// functions
function setMultiplier() {
    // find multiplier
    let allLats = [];
    let allLons = [];
    for (const wayId in data) {
        const way = data[wayId];
        for (const nodeId in way.nodes) {
            const node = way.nodes[nodeId];
            allLats.push(node.lat);
            allLons.push(node.lon);
        }
    }
    maxLat = Math.max(...allLats);
    minLat = Math.min(...allLats);
    maxLon = Math.max(...allLons);
    minLon = Math.min(...allLons);
    multiplier = Math.sqrt(Math.min(...[canvas.height / (maxLat - minLat), canvas.width / (maxLon - minLon)]));
}
function getTotalMultiplier() {
    return (multiplier + zoom) ** 2;
}
function getOffset(totalMultiplier) {
    return new coordinate(canvas.width / 2 - (minLon + ((maxLon - minLon) / 2)) * totalMultiplier + mouseOffset.x + zoomOffset.x, canvas.height / 2 + (minLat + ((maxLat - minLat) / 2)) * totalMultiplier + mouseOffset.y + zoomOffset.y);
}
function zoomInOut(inOut, source) {
    if (!data) {
        return;
    }
    let totalMultiplier = getTotalMultiplier();
    let offset = getOffset(totalMultiplier);
    const mousePosition = source == "mouse" ? new coordinate(mousePos.x - canvas.offsetLeft, mousePos.y - canvas.offsetTop) : new coordinate(canvas.width / 2, canvas.height / 2);
    const mouseCoord = new coordinate((mousePosition.x - offset.x) / totalMultiplier, -(mousePosition.y - offset.y) / totalMultiplier);
    zoom += inOut == "in" ? zoomIncrement : (Math.sqrt(totalMultiplier) - zoomIncrement > 0 ? -zoomIncrement : 0);
    totalMultiplier = getTotalMultiplier();
    offset = getOffset(totalMultiplier);
    const newCoord = new coordinate(offset["x"] + mouseCoord.x * totalMultiplier, offset["y"] - mouseCoord.y * totalMultiplier);
    const diff = new coordinate(mousePosition.x - newCoord.x, mousePosition.y - newCoord.y);
    zoomOffset.x += diff.x;
    zoomOffset.y += diff.y;
    drawCanvas();
}
function centre() {
    if (!data) {
        return;
    }
    mouseOffset.reset();
    zoomOffset.reset();
    zoom = 0;
    setMultiplier();
    drawCanvas();
}
function metresToDegrees(metres) {
    const percentDegrees = metres / degreesRange;
    return metres = percentDegrees * 180;
}
function degreesToPixels(degrees) {
    return degrees * getTotalMultiplier();
}
function getAllCacheKeys() {
    return new Promise(resolve => {
        let transaction = db.transaction("overpass-cache", "readonly");
        let objectStore = transaction.objectStore("overpass-cache");
        let transactionRequest = objectStore.getAllKeys();
        transactionRequest.onerror = (e) => {
            console.error(`Error: ${e.target.error}`);
        };
        transactionRequest.onsuccess = (e) => {
            resolve(e.target.result);
        };
    });
}
function getCachedFor(key) {
    return new Promise(resolve => {
        let transaction = db.transaction("overpass-cache", "readonly");
        let objectStore = transaction.objectStore("overpass-cache");
        let transactionRequest = objectStore.get(key);
        transactionRequest.onerror = (e) => {
            console.error(`Error: ${e.target.error}`);
        };
        transactionRequest.onsuccess = (e) => {
            resolve(e.target.result);
        };
    });
}
function insertInto(request, value) {
    return new Promise(resolve => {
        let transaction = db.transaction("overpass-cache", "readwrite");
        let objectStore = transaction.objectStore("overpass-cache");
        let transactionRequest = objectStore.add({ "request": request, "value": value });
        transactionRequest.onerror = (e) => {
            console.error(`Error: ${e.target.error}`);
            resolve(false);
        };
        transactionRequest.onsuccess = (e) => {
            resolve(true);
        };
    });
}
function deleteEntry(key) {
    return new Promise(resolve => {
        let transaction = db.transaction("overpass-cache", "readwrite");
        let objectStore = transaction.objectStore("overpass-cache");
        let transactionRequest = objectStore.delete(key);
        transactionRequest.onerror = (e) => {
            console.error(`Error: ${e.target.error}`);
            resolve(false);
        };
        transactionRequest.onsuccess = (e) => {
            resolve(true);
        };
    });
}
function drawLine(coordStart, coordEnd, strokeThickness = null, strokeColour = null, fillColour = null, lineCap = "butt") {
    // set zoom and offset
    const totalMultiplier = getTotalMultiplier();
    const offset = getOffset(totalMultiplier);
    // draw
    context.strokeStyle = strokeColour || "black";
    context.lineWidth = strokeThickness || 1;
    context.fillStyle = fillColour || "black";
    context.lineCap = lineCap;
    context.beginPath();
    context.moveTo(offset.x + coordStart.x * totalMultiplier, offset.y - coordStart.y * totalMultiplier);
    context.lineTo(offset.x + coordEnd.x * totalMultiplier, offset.y - coordEnd.y * totalMultiplier);
    if (fillColour != null)
        context.fill();
    if (strokeColour != null)
        context.stroke();
}
function drawPolygon(coordinates, strokeThickness = null, strokeColour = null, fillColour = null) {
    // set zoom and offset
    const totalMultiplier = getTotalMultiplier();
    const offset = getOffset(totalMultiplier);
    context.strokeStyle = strokeColour || "black";
    context.lineWidth = strokeThickness || 1;
    context.fillStyle = fillColour || "black";
    context.lineCap = "round";
    const path = new Path2D();
    path.moveTo(offset.x + coordinates[0].x * totalMultiplier, offset.y - coordinates[0].y * totalMultiplier);
    for (let i = 1; i < coordinates.length; i++) {
        path.lineTo(offset.x + coordinates[i].x * totalMultiplier, offset.y - coordinates[i].y * totalMultiplier);
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
function coordToScreenSpace(coord) {
    // set zoom and offset
    const totalMultiplier = getTotalMultiplier();
    const offset = getOffset(totalMultiplier);
    // return screenspace coordinate
    return new coordinate(offset.x + coord.x * totalMultiplier, offset.y - coord.y * totalMultiplier);
}
function screenSpaceToCoord(screenSpace) {
    // set zoom and offset
    const totalMultiplier = getTotalMultiplier();
    const offset = getOffset(totalMultiplier);
    // return latlon coordinate
    return new coordinate((screenSpace.x - offset.x) / totalMultiplier, -(screenSpace.y - offset.y) / totalMultiplier);
}
function drawArrow(type, width, length, centre, angle) {
    const arrowBaseLength = width * 0.35;
    const arrowArmLength = (arrowBaseLength / 2) / Math.tan(Math.PI / 12);
    if (type == "through") {
        const lineStart = new coordinate(centre.x - Math.cos(angle) * length / 2 * 0.9, centre.y - Math.sin(angle) * length / 2 * 0.9);
        const lineEnd = new coordinate(centre.x + Math.cos(angle) * length / 2 * 0.9, centre.y + Math.sin(angle) * length / 2 * 0.9);
        const arrowArmAngle = angle + Math.PI * 1 / 6;
        const arrowBaseAngle = arrowArmAngle - Math.PI * 2 / 3;
        const arrowStart = new coordinate(lineEnd.x - Math.cos(arrowArmAngle) * arrowArmLength / 2, lineEnd.y - Math.sin(arrowArmAngle) * arrowArmLength / 2);
        const arrowEnd = new coordinate(arrowStart.x - Math.cos(arrowBaseAngle) * arrowBaseLength, arrowStart.y - Math.sin(arrowBaseAngle) * arrowBaseLength);
        drawLine(lineStart, lineEnd, degreesToPixels(metresToDegrees(0.2)), "white", null, "round");
        drawPolygon([lineEnd, arrowStart, arrowEnd], 0, "white", "white");
    }
    else if (type == "left") {
        const lineStart = new coordinate(centre.x - Math.cos(angle) * length / 2 * 0.9, centre.y - Math.sin(angle) * length / 2 * 0.9);
        const lineEnd = new coordinate(centre.x + Math.cos(angle) * length / 2 * 0, centre.y + Math.sin(angle) * length / 2 * 0);
        const arrowLineEnd = new coordinate(lineEnd.x + Math.cos(angle + Math.PI / 2) * width * 0.075, lineEnd.y + Math.sin(angle + Math.PI / 2) * width * 0.075);
        const arrowArmAngle = angle - Math.PI * 1 / 3;
        const arrowBaseAngle = arrowArmAngle + Math.PI * 2 / 3;
        const arrowStart = new coordinate(arrowLineEnd.x + Math.cos(angle) * arrowBaseLength / 2, arrowLineEnd.y + Math.sin(angle) * arrowBaseLength / 2);
        const arrowMid = new coordinate(arrowStart.x - Math.cos(arrowArmAngle) * arrowArmLength / 2, arrowStart.y - Math.sin(arrowArmAngle) * arrowArmLength / 2);
        const arrowEnd = new coordinate(arrowMid.x - Math.cos(arrowBaseAngle) * arrowArmLength / 2, arrowMid.y - Math.sin(arrowBaseAngle) * arrowArmLength / 2);
        drawLine(lineStart, lineEnd, degreesToPixels(metresToDegrees(0.2)), "white", null, "round");
        drawLine(lineEnd, arrowLineEnd, degreesToPixels(metresToDegrees(0.2)), "white", null, "round");
        drawPolygon([arrowStart, arrowMid, arrowEnd], 0, "white", "white");
    }
    else if (type == "right") {
        const lineStart = new coordinate(centre.x - Math.cos(angle) * length / 2 * 0.9, centre.y - Math.sin(angle) * length / 2 * 0.9);
        const lineEnd = new coordinate(centre.x + Math.cos(angle) * length / 2 * 0, centre.y + Math.sin(angle) * length / 2 * 0);
        const arrowLineEnd = new coordinate(lineEnd.x + Math.cos(angle - Math.PI / 2) * width * 0.075, lineEnd.y + Math.sin(angle - Math.PI / 2) * width * 0.075);
        const arrowArmAngle = angle + Math.PI * 1 / 3;
        const arrowBaseAngle = arrowArmAngle + Math.PI * 1 / 3;
        const arrowStart = new coordinate(arrowLineEnd.x + Math.cos(angle) * arrowBaseLength / 2, arrowLineEnd.y + Math.sin(angle) * arrowBaseLength / 2);
        const arrowMid = new coordinate(arrowStart.x - Math.cos(arrowArmAngle) * arrowArmLength / 2, arrowStart.y - Math.sin(arrowArmAngle) * arrowArmLength / 2);
        const arrowEnd = new coordinate(arrowMid.x + Math.cos(arrowBaseAngle) * arrowArmLength / 2, arrowMid.y + Math.sin(arrowBaseAngle) * arrowArmLength / 2);
        drawLine(lineStart, lineEnd, degreesToPixels(metresToDegrees(0.2)), "white", null, "round");
        drawLine(lineEnd, arrowLineEnd, degreesToPixels(metresToDegrees(0.2)), "white", null, "round");
        drawPolygon([arrowStart, arrowMid, arrowEnd], 0, "white", "white");
    }
}
async function overpassQuery(query) {
    let data;
    const allCacheKeys = await getAllCacheKeys();
    if (allCacheKeys.includes(query) && !settings["Ignore Cache"].value) {
        const request = await getCachedFor(query);
        data = request["value"];
    }
    else {
        const request = await overpassGetData(query);
        data = request;
    }
    return new Promise(resolve => { resolve(data); });
}
async function overpassGetData(query) {
    return new Promise(resolve => {
        displayMessage("Downloading from Overpass...");
        const request = new XMLHttpRequest();
        request.open("POST", getSetting("Endpoint"));
        request.send(query);
        request.onload = async () => {
            if (request.readyState == 4) {
                if (request.status == 200) {
                    const allKeys = await getAllCacheKeys();
                    if (allKeys.includes(query)) {
                        await deleteEntry(query);
                    }
                    if (JSON.parse(request.response).elements.length != 0)
                        await insertInto(query, request.response);
                    resolve(request.response);
                }
                else {
                    console.error(`Error ${request.status}: ${request.statusText}`);
                    displayMessage(`Overpass Error ${request.status}: ${request.statusText}`);
                    resolve(`error`);
                }
            }
        };
    });
}
function setHTMLSizes() {
    canvas.setAttribute("width", `${canvas.clientWidth}px`);
    canvas.setAttribute("height", `${canvas.clientHeight}px`);
    canvasOverlay.style.width = `${canvas.width}px`;
    canvasOverlay.style.top = `${canvas.offsetTop}px`;
    canvasOverlay.style.left = `${canvas.offsetLeft}px`;
    const newHeight = window.innerHeight - canvas.offsetTop - 20;
    document.documentElement.style.setProperty("--canvas-height", `${newHeight}px`);
    canvas.height = newHeight;
    // setup button offsets for all tooltips
    document.querySelectorAll("[tooltip]").forEach(element => {
        const button = element;
        const offsetWidth = `${button.children[0].scrollWidth / 2}px`;
        button.style.setProperty("--width", offsetWidth);
    });
    drawCanvas();
}
function setSearchState(state) {
    while (searchButton.lastChild)
        searchButton.lastChild.remove();
    switch (state) {
        case "normal":
            searchButton.append(fontAwesomeIcon("solid", "magnifying-glass"));
            searchButton.setAttribute("tooltip", "Search");
            settingsButton.disabled = false;
            break;
        case "searching":
            searchButton.setAttribute("tooltip", "Loading...");
            searchButton.append(fontAwesomeIcon("solid", "circle-notch", "spin"));
            settingsButton.disabled = true;
            break;
    }
}
async function display() {
    setSearchState("searching");
    const roadName = inputField.value;
    if (roadName.length == 0) {
        displayMessage("Please enter a search term.");
        setSearchState("normal");
        return;
    }
    if (roadName.includes("\"")) {
        displayMessage("Currently, double quotes (\") are not supported for relation name lookup.");
        setSearchState("normal");
        return;
    }
    const searchMode = isNaN(parseInt(roadName)) ? `<has-kv k="name" v="${roadName}"/>` : `<id-query type="relation" ref="${roadName}"/>`;
    const query = await overpassQuery(`<osm-script output="json"><union><query type="relation">${searchMode}</query><recurse type="relation-way"/><recurse type="way-node"/><recurse type="node-way"/></union><print/></osm-script>`);
    if (query == "error") {
        setSearchState("normal");
        return;
    }
    const elements = JSON.parse(query).elements;
    let relation;
    let allWays = {}, allNodes = {}, nodeIds = [];
    let multipleRelations = false;
    elements.forEach(element => {
        if (!multipleRelations) {
            switch (element.type) {
                case "relation":
                    if (relation) {
                        multipleRelations = true;
                    }
                    relation = element;
                    currentRelationId = element.id;
                    break;
                case "way":
                    if (Object.keys(element.tags).includes("highway"))
                        allWays[element.id] = element;
                    break;
                case "node":
                    allNodes[element.id] = element;
                    if (!Object.keys(nodeIds).includes(element.id))
                        nodeIds.push(element.id);
                    break;
            }
        }
    });
    if (multipleRelations) {
        displayMessage("Multiple relations share that name. Please use relation id.");
        setSearchState("normal");
        return;
    }
    if (!currentRelationId || !relation) {
        displayMessage("No result");
        setSearchState("normal");
        return;
    }
    let wayIdsInRelation = [];
    relation.members.forEach(member => {
        wayIdsInRelation.push(member.ref);
    });
    let externalWays = [];
    Object.keys(allWays).forEach(wayId => {
        if (!wayIdsInRelation.includes(parseInt(wayId))) {
            externalWays.push(allWays[wayId]);
            delete allWays[wayId];
        }
    });
    process(allWays, allNodes, nodeIds);
    drawCanvas();
    centre();
    globalAllWays = allWays;
    window.location.hash = `#${currentRelationId}`;
    setSearchState("normal");
}
function process(allWays, allNodes, allNodeIds) {
    console.log(allNodes);
    let waysInfo = {};
    // loop through each way and store information about it
    Object.keys(allWays).forEach(wayId => {
        const way = allWays[wayId];
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
            "warnings": []
        };
        allWays[wayId].nodes.forEach(nodeId => {
            waysInfo[wayId].nodes[nodeId] = {
                "id": nodeId,
                "lat": allNodes[nodeId].lat,
                "lon": allNodes[nodeId].lon,
            };
            waysInfo[wayId].orderedNodes.push(nodeId);
        });
        // set junction
        waysInfo[wayId].junction = (Object.keys(way.tags).includes("junction")) ? way.tags.junction : null;
        // set oneway
        waysInfo[wayId].oneway = (Object.keys(way.tags).includes("oneway") && way.tags.oneway == "yes") || (Object.keys(way.tags).includes("junction") && way.tags.junction == "roundabout") ? true : false;
        // set lanes to specified value
        waysInfo[wayId].lanes = Object.keys(way.tags).includes("lanes") ? way.tags.lanes : null;
        // set lanes:forward to specified value
        waysInfo[wayId]["lanes:forward"] = Object.keys(way.tags).includes("lanes:forward") ? way.tags["lanes:forward"] : null;
        // set lanes:backward to specified value
        waysInfo[wayId]["lanes:backward"] = Object.keys(way.tags).includes("lanes:backward") ? way.tags["lanes:backward"] : null;
        // set turn:lanes:forward to specified value, or default if not
        waysInfo[wayId]["turn:lanes:forward"] = Object.keys(way.tags).includes("turn:lanes:forward") ? way.tags["turn:lanes:forward"] : null;
        // set turn:lanes:backward to specified value, or default if not
        waysInfo[wayId]["turn:lanes:backward"] = Object.keys(way.tags).includes("turn:lanes:backward") ? way.tags["turn:lanes:backward"] : null;
        // set surface to specified value, or unknown if not
        waysInfo[wayId]["surface"] = Object.keys(way.tags).includes("surface") ? way.tags["surface"] : "unknown";
        // loop through the following data that could be inferred until no more changes can be made
        let noChanges = false;
        while (!noChanges) {
            noChanges = true;
            // fill in lanes if isn't specified, but can be inferred from other values
            if (waysInfo[wayId].lanes == null && waysInfo[wayId]["lanes:forward"] != null && waysInfo[wayId]["lanes:backward"] != null) {
                waysInfo[wayId].lanes = (parseInt(waysInfo[wayId]["lanes:forward"]) || 0) + (parseInt(waysInfo[wayId]["lanes:backward"]) || 0);
                noChanges = false;
            }
            // fill in lanes:forward if isn't specified, but can be inferred from other values
            if (waysInfo[wayId]["lanes:forward"] == null && waysInfo[wayId].lanes != null && waysInfo[wayId]["lanes:backward"] != null) {
                waysInfo[wayId]["lanes:forward"] = (waysInfo[wayId].lanes || 0) - (waysInfo[wayId]["lanes:backward"] || 0);
                noChanges = false;
            }
            else if (waysInfo[wayId]["lanes:forward"] == null && waysInfo[wayId].lanes != null && waysInfo[wayId].oneway) {
                waysInfo[wayId]["lanes:forward"] = waysInfo[wayId].lanes;
                noChanges = false;
            }
            else if (waysInfo[wayId]["lanes:forward"] == null && !waysInfo[wayId].oneway && waysInfo[wayId].lanes != null && (waysInfo[wayId].lanes || 0) % 2 == 0) {
                waysInfo[wayId]["lanes:forward"] = (waysInfo[wayId].lanes || 0) / 2;
            }
            // fill in lanes:backward if isn't specified, but can be inferred from other values
            if (waysInfo[wayId]["lanes:backward"] == null && waysInfo[wayId].lanes != null && waysInfo[wayId]["lanes:forward"] != null) {
                waysInfo[wayId]["lanes:backward"] = (waysInfo[wayId].lanes || 0) - (waysInfo[wayId]["lanes:forward"] || 0);
                noChanges = false;
            }
            else if (waysInfo[wayId]["lanes:backward"] == null && waysInfo[wayId].lanes != null && waysInfo[wayId].oneway) {
                waysInfo[wayId]["lanes:backward"] = 0;
                noChanges = false;
            }
            else if (waysInfo[wayId]["lanes:backward"] == null && !waysInfo[wayId].oneway && waysInfo[wayId].lanes != null && (waysInfo[wayId].lanes || 0) % 2 == 0) {
                waysInfo[wayId]["lanes:backward"] = (waysInfo[wayId].lanes || 0) / 2;
                noChanges = false;
            }
            // fill in turn:lanes:forward if isn't specified, but can be inferred from other values
            if (waysInfo[wayId]["turn:lanes:forward"] == null && waysInfo[wayId].oneway && Object.keys(way.tags).includes("turn:lanes") && way.tags["turn:lanes"] != null) {
                waysInfo[wayId]["turn:lanes:forward"] = way.tags["turn:lanes"];
                noChanges = false;
            }
            else if (waysInfo[wayId]["turn:lanes:forward"] == null && waysInfo[wayId]["lanes:forward"] != null) {
                waysInfo[wayId]["turn:lanes:forward"] = "none|".repeat(waysInfo[wayId]["lanes:forward"] || 0).slice(0, -1) || null;
                noChanges = false;
            }
            // fill in turn:lanes:backward if isn't specified, but can be inferred from other values
            if (waysInfo[wayId]["turn:lanes:backward"] == null && waysInfo[wayId]["lanes:backward"] != null) {
                waysInfo[wayId]["turn:lanes:backward"] = "none|".repeat(waysInfo[wayId]["lanes:backward"] || 0).slice(0, -1) || null;
            }
        }
        // replace all the "|" with "none|" in turn lanes
        if (waysInfo[wayId]["turn:lanes:forward"] != null) {
            let turnLanesForward = (waysInfo[wayId]["turn:lanes:forward"] || "none").split("|");
            let turnLanesForwardString = "";
            for (let i = 0; i < turnLanesForward.length; i++) {
                const marking = turnLanesForward[i] || "none";
                turnLanesForwardString += `${marking}|`;
            }
            turnLanesForwardString = turnLanesForwardString.substring(0, turnLanesForwardString.length - 1);
            waysInfo[wayId]["turn:lanes:forward"] = turnLanesForwardString;
        }
        if (waysInfo[wayId]["turn:lanes:backward"] != null) {
            let turnLanesBackward = (waysInfo[wayId]["turn:lanes:backward"] || "none").split("|");
            let turnLanesBackwardString = "";
            for (let i = 0; i < turnLanesBackward.length; i++) {
                const marking = turnLanesBackward[i] || "none";
                turnLanesBackwardString += `${marking}|`;
            }
            turnLanesBackwardString = turnLanesBackwardString.substring(0, turnLanesBackwardString.length - 1);
            waysInfo[wayId]["turn:lanes:backward"] = turnLanesBackwardString;
        }
        // add a "none" to the end of strings with a | at the end
        if (waysInfo[wayId]["turn:lanes:backward"] != null && waysInfo[wayId]["turn:lanes:backward"].slice(-1) == "|") {
            waysInfo[wayId]["turn:lanes:backward"] += "none";
        }
        if (waysInfo[wayId]["turn:lanes:forward"] != null && waysInfo[wayId]["turn:lanes:forward"].slice(-1) == "|") {
            waysInfo[wayId]["turn:lanes:forward"] += "none";
        }
    });
    let convertedData = {};
    Object.keys(waysInfo).forEach(wayId => {
        const way = waysInfo[wayId];
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
                "id": node.id,
                "lat": node.lat,
                "lon": node.lon
            };
        });
    });
    data = convertedData;
    setMultiplier();
}
async function drawCanvas() {
    var _a;
    // clear canvas from previous drawings
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawnElements = [];
    // if no data, return
    if (!data) {
        return;
    }
    else {
        (_a = document.getElementById("empty-message")) === null || _a === void 0 ? void 0 : _a.remove();
    }
    ;
    // reset ignoreCache
    settings["Ignore Cache"].value = false;
    // for way in data
    for (const wayId in data) {
        const way = data[wayId];
        const lanes = way.lanes || 2;
        for (const key in way.orderedNodes) {
            const nextKey = (parseInt(key) + 1).toString();
            if (parseInt(nextKey) == way.orderedNodes.length)
                continue;
            const thisNodeId = way.orderedNodes[key];
            const nextNodeId = way.orderedNodes[nextKey];
            const thisNode = way.nodes[thisNodeId];
            const nextNode = way.nodes[nextNodeId];
            // points along the way
            const x1 = thisNode.lon;
            const y1 = thisNode.lat;
            const x2 = nextNode.lon;
            const y2 = nextNode.lat;
            const thisPos = new coordinate(x1, y1);
            const nextPos = new coordinate(x2, y2);
            // angles are the atan of the gradient, however gradients doesn't tell direciton. the condition checks if the configuration of points leads to a 'flipped' gradient
            const gradient = (y2 - y1) / (x2 - x1);
            const angle = (y1 > y2 && x1 > x2) || (y1 < y2 && x1 > x2) ? Math.atan(gradient) + Math.PI : Math.atan(gradient);
            const adjacentAngle = angle + Math.PI / 2;
            // define the four corners of the box around the way
            const thisTopCornerPos = new coordinate(x1 + Math.cos(adjacentAngle) * laneLength * (lanes / 2), y1 + Math.sin(adjacentAngle) * laneLength * (lanes / 2));
            const thisBtmCornerPos = new coordinate(x1 - Math.cos(adjacentAngle) * laneLength * (lanes / 2), y1 - Math.sin(adjacentAngle) * laneLength * (lanes / 2));
            const nextTopCornerPos = new coordinate(x2 + Math.cos(adjacentAngle) * laneLength * (lanes / 2), y2 + Math.sin(adjacentAngle) * laneLength * (lanes / 2));
            const nextBtmCornerPos = new coordinate(x2 - Math.cos(adjacentAngle) * laneLength * (lanes / 2), y2 - Math.sin(adjacentAngle) * laneLength * (lanes / 2));
            const allPos = [[thisPos.x, nextPos.x, thisTopCornerPos.x, thisBtmCornerPos.x, nextTopCornerPos.x, nextBtmCornerPos.x], [thisPos.y, nextPos.y, thisTopCornerPos.y, thisBtmCornerPos.y, nextTopCornerPos.y, nextBtmCornerPos.y]];
            let allOffScreen = [["unknown", "unknown", "unknown", "unknown", "unknown", "unknown"], ["unknown", "unknown", "unknown", "unknown", "unknown", "unknown"]];
            // check to see if any of the box is visible on screen
            for (let i = 0; i < 6; i++) {
                const xPos = coordToScreenSpace(new coordinate(allPos[0][i], 0)).x;
                const yPos = coordToScreenSpace(new coordinate(0, allPos[1][i])).y;
                if (xPos < 0)
                    allOffScreen[0][i] = "above";
                else if (xPos > canvas.width)
                    allOffScreen[0][i] = "below";
                else
                    allOffScreen[0][i] = "in";
                if (yPos < 0)
                    allOffScreen[1][i] = "above";
                else if (yPos > canvas.height)
                    allOffScreen[1][i] = "below";
                else
                    allOffScreen[1][i] = "in";
            }
            // see if all x and y values are in the same 'place' and display box accordingly
            const allXEqual = allOffScreen[0].every((val, i, arr) => val === arr[0]);
            const allYEqual = allOffScreen[1].every((val, i, arr) => val === arr[0]);
            if ((allXEqual && allOffScreen[0][0] != "in") || (allYEqual && allOffScreen[1][0] != "in"))
                continue;
            const lanesForward = way["lanes:forward"] || ((way.oneway) ? lanes : lanes / 2);
            const lanesBackward = way["lanes:backward"] || ((way.oneway) ? 0 : lanes / 2);
            const turnLanesForward = (way["turn:lanes:forward"] || "none").split("|");
            const turnLanesBackward = (way["turn:lanes:backward"] || "none").split("|");
            const leftTraffic = bool(getSetting("Left Hand Traffic"));
            const directionality = leftTraffic ? 1 : -1;
            for (let i = 0; i < lanes; i++) {
                const roadColour = roadColours[Object.keys(roadColours).includes(way.surface || "unknown") ? way.surface || "unknown" : "unknown"];
                const thisStartCoord = new coordinate(thisTopCornerPos.x - Math.cos(adjacentAngle) * laneLength * i, thisTopCornerPos.y - Math.sin(adjacentAngle) * laneLength * i);
                const thisEndCoord = new coordinate(nextTopCornerPos.x - Math.cos(adjacentAngle) * laneLength * i, nextTopCornerPos.y - Math.sin(adjacentAngle) * laneLength * i);
                const nextStartCoord = new coordinate(thisTopCornerPos.x - Math.cos(adjacentAngle) * laneLength * (i + 1), thisTopCornerPos.y - Math.sin(adjacentAngle) * laneLength * (i + 1));
                const nextEndCoord = new coordinate(nextTopCornerPos.x - Math.cos(adjacentAngle) * laneLength * (i + 1), nextTopCornerPos.y - Math.sin(adjacentAngle) * laneLength * (i + 1));
                drawPolygon([thisStartCoord, thisEndCoord, nextEndCoord, nextStartCoord], degreesToPixels(metresToDegrees(0.15)), "#dddddd", roadColour);
                // turn markings
                let lanesString;
                if (leftTraffic) {
                    lanesString = i < lanesForward ? (turnLanesForward[i] || "none") : (turnLanesBackward[turnLanesBackward.length + (lanesForward - i) - 1] || "none");
                }
                else {
                    lanesString = i < lanesBackward ? (turnLanesBackward[i] || "none") : (turnLanesForward[turnLanesForward.length + (lanesBackward - i) - 1] || "none");
                }
                const markings = lanesString.includes(";") ? lanesString.split(";") : [lanesString];
                const allX = [thisStartCoord.x, thisEndCoord.x, nextStartCoord.x, nextEndCoord.x];
                const allY = [thisStartCoord.y, thisEndCoord.y, nextStartCoord.y, nextEndCoord.y];
                const maxCoord = new coordinate(Math.max(...allX), Math.max(...allY));
                const minCoord = new coordinate(Math.min(...allX), Math.min(...allY));
                // along with finding the length and width, adjust them to be negative if it is a backwards lane
                const centre = new coordinate((maxCoord.x + minCoord.x) / 2, (maxCoord.y + minCoord.y) / 2);
                const length = Math.sqrt((thisStartCoord.x - thisEndCoord.x) ** 2 + (thisStartCoord.y - thisEndCoord.y) ** 2) * (i < lanesForward ? directionality : -directionality);
                const width = Math.sqrt((thisStartCoord.x - nextStartCoord.x) ** 2 + (thisStartCoord.y - nextStartCoord.y) ** 2) * (i < lanesForward ? directionality : -directionality);
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
            // centre line
            const centreStartCoord = new coordinate(thisTopCornerPos.x - Math.cos(adjacentAngle) * laneLength * lanesForward, thisTopCornerPos.y - Math.sin(adjacentAngle) * laneLength * lanesForward);
            const centreEndCoord = new coordinate(nextTopCornerPos.x - Math.cos(adjacentAngle) * laneLength * lanesForward, nextTopCornerPos.y - Math.sin(adjacentAngle) * laneLength * lanesForward);
            if (!way.oneway)
                drawLine(centreStartCoord, centreEndCoord, degreesToPixels(metresToDegrees(0.5)), "white");
            // draw select outline if selected
            const outlined = selectedWay == parseInt(wayId);
            const path = drawPolygon([thisBtmCornerPos, thisTopCornerPos, nextTopCornerPos, nextBtmCornerPos], outlined ? 5 : 1, outlined ? "lightblue" : "#222233");
            drawnElements[Object.keys(drawnElements).length] = {
                wayId: wayId,
                path: path
            };
        }
    }
}
function setSetting(settingName, value) {
    const setting = settings[settingName];
    if (setting.setLocalStorage) {
        window.localStorage.setItem(settingName, value.toString());
    }
    else {
        settings[settingName].value = value;
    }
    settingUpdate();
}
function getSetting(settingName) {
    const setting = settings[settingName];
    if (setting.setLocalStorage) {
        return window.localStorage.getItem(settingName) || "";
    }
    else {
        return setting.value.toString();
    }
}
function bool(value) {
    return value == "true" || value == true;
}
function settingUpdate() {
    // update page to reflect changes
    document.body.setAttribute("darkmode", getSetting("Dark Mode").toString());
}
function popupHeading(title) {
    const heading = document.createElement("h2");
    heading.textContent = title;
    return heading;
}
function element(type, options) {
    const element = document.createElement(type);
    if (!options)
        return element;
    if (options.textContent)
        element.textContent = options.textContent;
    if (options.id)
        element.id = options.id;
    if (options.classList)
        element.classList.add(...options.classList);
    if (options.tooltip)
        element.setAttribute("data-tooltip", options.tooltip);
    if (options.type)
        element.setAttribute("type", options.type);
    if (options.src)
        element.setAttribute("src", options.src);
    if (options.attributes)
        Object.keys(options.attributes).forEach(key => { element.setAttribute(key, options.attributes[key]); });
    return element;
}
function fontAwesomeIcon(style, icon, animation) {
    const element = document.createElement("i");
    element.classList.add(...[`fa-${style}`, `fa-${icon}`]);
    if (animation)
        element.classList.add(`fa-${animation}`);
    return element;
}
async function togglePopup(reason) {
    if (popup.open) {
        popup.setAttribute("closing", "");
        popup.addEventListener("animationend", () => {
            popup.removeAttribute("closing");
            popup.close();
        }, { once: true });
        return;
    }
    while (popup.lastChild) {
        popup.lastChild.remove();
    }
    if (reason != "welcome")
        popup.append(element("h2", { textContent: reason }));
    switch (reason) {
        case "share":
            const copyContainer = element("div", { id: "copy-container" });
            const shareSpan = element("span", { classList: ["share"], textContent: `${window.location.origin}${window.location.pathname}#${currentRelationId}` });
            const copyButton = element("button", { id: "copy-button", classList: ["copy"] });
            const copyIcon = fontAwesomeIcon("solid", "copy");
            const openWithContainer = element("div", { classList: ["open-with-container"] });
            const openiDButton = element("button", { id: "osm", classList: ["open-with"], tooltip: "Open in iD" });
            const openiDIcon = fontAwesomeIcon("solid", "map");
            const openJosmButton = element("button", { id: "josm", classList: ["open-with"], tooltip: "Open in JOSM" });
            const openJosmIcon = fontAwesomeIcon("solid", "desktop");
            openJosmButton.append(openJosmIcon);
            openiDButton.append(openiDIcon);
            openWithContainer.append(openiDButton, openJosmButton);
            copyButton.append(copyIcon);
            copyContainer.append(shareSpan, copyButton);
            popup.append(copyContainer, openWithContainer);
            copyButton.addEventListener("click", () => {
                navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${currentRelationId}`).then(() => {
                    copyButton.children[0].classList.remove("fa-copy");
                    copyButton.children[0].classList.add("fa-check");
                });
            });
            openiDButton.addEventListener("click", () => { window.open(`https://www.openstreetmap.org/relation/${currentRelationId}`, "_blank", "noreferrer noopener"); });
            openJosmIcon.addEventListener("click", () => { openJOSM(`http://127.0.0.1:8111/load_and_zoom?left=${minLon}&right=${maxLon}&top=${maxLat}&bottom=${minLat}&select=relation${currentRelationId}`); });
            break;
        case "settings":
            const settingsList = element("div", { id: "settings-list" });
            popup.append(settingsList);
            Object.keys(settings).forEach(settingName => {
                if (!settings[settingName].inSettings)
                    return;
                const settingDescripton = settings[settingName].description;
                const checkbox = settings[settingName].inputType == "boolean";
                const outerDiv = element("div", { classList: ["setting-container"] });
                const innerDiv = element("div", { classList: ["setting-text"] });
                const heading = element("h3", { textContent: settingName });
                const text = element("p", { textContent: settingDescripton });
                const inputBox = element("input", { type: checkbox ? "checkbox" : "text", attributes: { "data-setting": settingName } });
                if (checkbox)
                    inputBox.checked = settings[settingName].setLocalStorage ? bool(getSetting(settingName)) : bool(settings[settingName].value);
                else
                    inputBox.value = inputBox.value = getSetting(settingName);
                innerDiv.append(heading, text);
                outerDiv.append(innerDiv, inputBox);
                settingsList.append(outerDiv);
                inputBox.addEventListener("change", (e) => {
                    const target = e.target;
                    setSetting(target.getAttribute("data-setting"), target.getAttribute("type") == "checkbox" ? target.checked : target.value);
                });
            });
            break;
        case "help":
            const tempHelp = element("p", { textContent: "Coming soon. Stay Tuned." });
            popup.append(tempHelp);
            break;
        case "about":
            const description = element("p", { textContent: "Welcome to Merge! This project is still in it's early stages so bugs are missing features are to be expected. If you find any issues that aren't already known, please submit a report to the Github page." });
            const githubDiv = element("div", { id: "githubDiv" });
            const githubIcon = fontAwesomeIcon("brands", "github");
            const githubLabel = element("p", { textContent: "Github" });
            githubDiv.append(...[githubIcon, githubLabel]);
            popup.append(...[description, githubDiv]);
            githubDiv.addEventListener("click", () => window.open("https://www.github.com/lachlan2357/merge", "_blank", "noreferrer noopener"));
            break;
        case "advanced":
            const tempAdvanced = element("p", { textContent: "Coming soon. Stay Tuned." });
            popup.append(tempAdvanced);
            break;
        case "welcome":
            const img = element("img", { id: "welcome-img", src: "assets/icon.png" });
            const heading = element("h2", { id: "welcome-heading", textContent: "Merge" });
            const desc = element("p", { textContent: "Welcome to Merge! To get started, use the search box to lookup a relation by either RelationID or name. Note: once each request has successfully returned information, the data is cached and when requested again, it pulls from the cache. To re-request data, toggle the options in settings." });
            popup.append(...[img, heading, desc]);
    }
    // add close button
    const popupCloseButton = document.createElement("button");
    popupCloseButton.id = "popup-close";
    popupCloseButton.classList.add("button");
    const xMark = document.createElement("i");
    xMark.classList.add(...["fa-solid", "fa-xmark"]);
    popupCloseButton.appendChild(xMark);
    popup.appendChild(popupCloseButton);
    const popupClose = document.getElementById("popup-close");
    popupClose.addEventListener("click", () => { togglePopup(); });
    setHTMLSizes();
    popup.showModal();
}
async function displayMessage(message) {
    const numMessageBoxes = messages.children.length;
    const id = `message-box-${numMessageBoxes}`;
    //div id="message-box"><p>Message</p></div>
    const newDiv = document.createElement("div");
    newDiv.id = id;
    newDiv.classList.add("message-box");
    const newPara = element("p", { textContent: message });
    newDiv.appendChild(newPara);
    messages.appendChild(newDiv);
    newDiv.setAttribute("visible", "");
    await new Promise(r => setTimeout(r, 5000));
    newDiv.setAttribute("closing", "");
    newDiv.addEventListener("animationend", () => {
        newDiv.removeAttribute("closing");
        newDiv.removeAttribute("visible");
        messages.removeChild(newDiv);
    }, { once: true });
}
function hoverPath(click = true) {
    const canvasOffset = new coordinate(canvas.offsetLeft, canvas.offsetTop);
    let returner = false;
    Object.keys(drawnElements).forEach(id => {
        const element = drawnElements[id];
        const way = globalAllWays[element.wayId];
        const path = element.path;
        if (context.isPointInPath(path, mousePos.x - canvasOffset.x, mousePos.y - canvasOffset.y)) {
            returner = true;
            if (!click)
                return;
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
function openJOSM(query) {
    const req = new XMLHttpRequest();
    req.open("GET", `http://127.0.0.1:8111/load_and_zoom?left=${minLon}&right=${maxLon}&top=${maxLat}&bottom=${minLat}&select=relation${currentRelationId}`);
    req.send();
}
// overpass data
let data;
let currentRelationId;
// interactivity
let drawnElements;
let globalAllWays;
let selectedWay;
// reference html elements
const canvas = document.getElementById("canvas");
const canvasOverlay = document.getElementById("canvas-overlay");
const inputField = document.getElementById("relation-name");
const searchButton = document.getElementById("search");
const advancedButton = document.getElementById("advanced");
const settingsButton = document.getElementById("settings");
const zoominButton = document.getElementById("zoom-in");
const zoomOutButton = document.getElementById("zoom-out");
const zoomResetButton = document.getElementById("zoom-reset");
const fullscreenButton = document.getElementById("fullscreen");
const shareButton = document.getElementById("share");
const helpButton = document.getElementById("help");
const aboutButton = document.getElementById("about");
const popup = document.getElementById("popup");
const popupBackdrop = document.getElementById("popup-backdrop");
const messages = document.getElementById("messages");
const wayInfo = document.getElementById("way-info");
const wayInfoId = document.getElementById("wayid");
const wayInfoTags = document.getElementById("tags");
const editIniD = document.getElementById("edit-id");
const editInJOSM = document.getElementById("edit-josm");
// setup canvas
const context = canvas.getContext("2d");
// popup button events
[shareButton, settingsButton, advancedButton, helpButton, aboutButton].forEach(button => {
    button.addEventListener("click", (e) => {
        const buttonId = e.target.id;
        if (buttonId == "share" && !currentRelationId) {
            displayMessage("Map is empty. Nothing to share.");
        }
        else {
            togglePopup(buttonId);
        }
    });
});
// multiplier variables
let maxLat;
let minLat;
let maxLon;
let minLon;
let multiplier;
// add event listeners 
let mousePos = new coordinate();
let mouseDown = false;
let mouseDownPos = new coordinate();
let mouseOffset = new coordinate();
let mouseMoved = false;
let zoomOffset = new coordinate();
window.addEventListener("resize", () => { setHTMLSizes(); });
searchButton.addEventListener("click", () => { display(); });
inputField.addEventListener("keydown", (e) => {
    if (e.key == "Enter") {
        searchButton.click();
        e.preventDefault();
    }
});
// canvas mouse controls
canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (!data) {
        return;
    }
    if (e.deltaY / Math.abs(e.deltaY) == 1) {
        zoomInOut("out", "mouse");
    }
    else {
        zoomInOut("in", "mouse");
    }
});
canvas.addEventListener("mousedown", (e) => {
    if (!data) {
        return;
    }
    mouseDown = true;
    mouseDownPos.setCoordinates(e.clientX - mouseOffset.x, e.clientY - mouseOffset.y);
    mouseMoved = false;
});
canvas.addEventListener("mouseup", (e) => {
    e.preventDefault();
    if (!data) {
        return;
    }
    if (!mouseMoved) {
        if (!hoverPath()) {
            wayInfo.setAttribute("hidden", "");
            selectedWay = -1;
        }
        drawCanvas();
    }
    mouseDown = false;
    mouseMoved = false;
});
canvas.addEventListener("mousemove", (e) => {
    e.preventDefault();
    if (!data) {
        return;
    }
    mousePos.setCoordinates(e.clientX, e.clientY);
    mouseMoved = true;
    if (mouseDown) {
        mouseOffset.setCoordinates(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
        drawCanvas();
    }
    if (hoverPath(false)) {
        canvas.style.cursor = "pointer";
    }
    else {
        canvas.style.cursor = "move";
    }
});
zoominButton.addEventListener("click", () => { zoomInOut("in", "button"); });
zoomOutButton.addEventListener("click", () => { zoomInOut("out", "button"); });
zoomResetButton.addEventListener("click", () => { centre(); setHTMLSizes(); });
fullscreenButton.addEventListener("click", () => {
    canvas.setAttribute("fullscreen", canvas.getAttribute("fullscreen") == "true" ? "false" : "true");
    setHTMLSizes();
});
editIniD.addEventListener("click", () => { window.open(`https://www.openstreetmap.org/edit?way=${selectedWay}`, "_blank", "noreferrer noopener"); });
editInJOSM.addEventListener("click", () => { openJOSM(`http://127.0.0.1:8111/load_and_zoom?left=${minLon}&right=${maxLon}&top=${maxLat}&bottom=${minLat}&select=way${selectedWay}`); });
//localStorage setup
Object.keys(settings).forEach(settingName => {
    const setting = settings[settingName];
    if (setting.setLocalStorage && !window.localStorage.getItem(settingName)) {
        window.localStorage.setItem(settingName, setting.value.toString());
    }
});
// indexeddb setup
let db;
let overpassCache;
const openIDB = window.indexedDB.open("Overpass Data");
openIDB.onerror = (e) => {
    console.error(`Error: ${e.target.error}`);
};
openIDB.onupgradeneeded = (e) => {
    db = e.target.result;
    overpassCache = db.createObjectStore("overpass-cache", { keyPath: "request" });
};
openIDB.onsuccess = (e) => {
    db = e.target.result;
    // deal with permalinks
    if (window.location.hash) {
        const relationId = window.location.hash.substring(1);
        inputField.value = relationId;
        searchButton.click();
    }
};
// zoom
let zoom = 0;
const zoomIncrement = 40;
// metresToDegrees calculation (all units to metres)
const earthRadius = 6371000;
const earthCircumference = 2 * Math.PI * earthRadius;
const degreesRange = earthCircumference / 2;
// set default lane width & length
const laneWidth = 3.5;
const laneLength = metresToDegrees(laneWidth);
// size canvas, show opening message and set settings values
setHTMLSizes();
settingUpdate();
// show first launch popup if first launch
if (bool(getSetting("First Launch"))) {
    setSetting("First Launch", "false");
    togglePopup("welcome");
}
