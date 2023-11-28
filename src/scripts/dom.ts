import { Canvas } from "./canvas.js";
import { ElementBuilder, FontAwesomeIcon, LinkChip } from "./elements.js";
import { Overpass } from "./overpass.js";
import { Settings, SettingsObject } from "./settings.js";
import { Coordinate } from "./supplement.js";
import { OverpassWay } from "./types.js";
import { State } from "./state.js";

export function getElement<K>(id: string) {
	return document.getElementById(id) as K;
}

const canvas = getElement<HTMLCanvasElement>("canvas");
const canvasContainer = getElement<HTMLDivElement>("canvas-container");
const searchButton = getElement<HTMLButtonElement>("search");
const advancedButton = getElement<HTMLButtonElement>("advanced");
const settingsButton = getElement<HTMLButtonElement>("settings");
const zoomInButton = getElement<HTMLButtonElement>("zoom-in");
const zoomOutButton = getElement<HTMLButtonElement>("zoom-out");
const zoomResetButton = getElement<HTMLButtonElement>("zoom-reset");
const fullscreenButton = getElement<HTMLButtonElement>("fullscreen");
const shareButton = getElement<HTMLButtonElement>("share");
const helpButton = getElement<HTMLButtonElement>("help");
const aboutButton = getElement<HTMLButtonElement>("about");
const popup = getElement<HTMLDialogElement>("popup");
const wayInfo = getElement<HTMLHeadingElement>("way-info");
const wayInfoId = getElement<HTMLHeadingElement>("wayid");
const wayInfoTags = getElement<HTMLTableElement>("tags");
const editInID = getElement<HTMLButtonElement>("edit-id");
const editInJOSM = getElement<HTMLButtonElement>("edit-josm");
const searchInput = getElement<HTMLInputElement>("relation-name");
const searchForm = getElement<HTMLFormElement>("search-form");

// popup buttons
shareButton.addEventListener("click", () => togglePopup("share"));
settingsButton.addEventListener("click", () => togglePopup("settings"));
advancedButton.addEventListener("click", () => togglePopup("advanced"));
helpButton.addEventListener("click", () => togglePopup("help"));
aboutButton.addEventListener("click", () => togglePopup("about"));

// search form
searchForm.addEventListener("submit", e => {
	e.preventDefault();
	const form = e.target as HTMLFormElement;
	const formData = new FormData(form);
	Overpass.search(formData.get("relation")?.toString() ?? "");
});

// canvas
canvas.addEventListener("wheel", e => {
	e.preventDefault();
	if (!State.data.get()) return;

	const inOut = e.deltaY > 0 ? "out" : "in";
	Canvas.zoom(inOut, "mouse");
});

canvas.addEventListener("mousedown", e => {
	e.preventDefault();
	if (!State.data.get()) return;

	const [x, y] = [e.clientX, e.clientY];
	const pos = new Coordinate(x, y).subtract(State.mouseOffset.get());
	State.mouseDownPos.set(pos);
	State.mouseDown.set(true);
	State.mouseMoved.set(false);
});

canvas.addEventListener("mouseup", e => {
	e.preventDefault();
	if (!State.data.get()) return;

	if (!State.mouseMoved.get() && !Canvas.checkHover()) {
		wayInfo.setAttribute("hidden", "");
		State.selectedWay.set(-1);
	}

	State.mouseDown.set(false);
	State.mouseMoved.set(false);
});

canvas.addEventListener("mousemove", e => {
	e.preventDefault();
	if (!State.data.get()) return;

	const [x, y] = [e.clientX, e.clientY];
	State.mousePos.set(new Coordinate(x, y));
	State.mouseMoved.set(true);

	if (State.mouseDown.get())
		State.mouseOffset.set(
			new Coordinate(x, y).subtract(State.mouseDownPos.get())
		);

	canvas.style.cursor = Canvas.checkHover(false) ? "pointer" : "move";
});

function updateCanvasSize() {
	const dimensions = new Coordinate(
		canvasContainer.clientWidth,
		canvasContainer.clientHeight
	);

	const offsetParent = canvasContainer.offsetParent as
		| HTMLElement
		| undefined;

	const parentOffset = new Coordinate(
		offsetParent?.offsetLeft || 0,
		offsetParent?.offsetTop || 0
	);

	const localOffset = new Coordinate(
		canvasContainer.offsetLeft,
		canvasContainer.offsetTop
	);

	const offset = parentOffset.add(localOffset);

	canvas.setAttribute("width", dimensions.x.toString());
	canvas.setAttribute("height", dimensions.y.toString());

	State.canvasOffset.set(offset);
	State.canvasDimensions.set(dimensions);
}

new ResizeObserver(updateCanvasSize).observe(canvasContainer);
window.addEventListener("resize", updateCanvasSize);

// canvas buttons
zoomInButton.addEventListener("click", () => Canvas.zoom("in", "button"));
zoomOutButton.addEventListener("click", () => Canvas.zoom("out", "button"));
zoomResetButton.addEventListener("click", () => Canvas.centre());
fullscreenButton.addEventListener("click", () =>
	canvasContainer.toggleAttribute("fullscreen")
);
editInID.addEventListener("click", editID);
editInJOSM.addEventListener("click", openJOSM);

// hooks
export function getContext() {
	return canvas.getContext("2d") ?? undefined;
}

export function setAndSearch(term?: string) {
	searchInput.value = term ?? "";
	if (term) Overpass.search(term);
}

export function setSearching(searching = true) {
	while (searchButton.lastChild) searchButton.lastChild.remove();

	const icon = new FontAwesomeIcon("solid");
	if (searching) icon.setIcon("circle-notch").animate("spin");
	else icon.setIcon("magnifying-glass");

	searchButton.append(icon.build());
	settingsButton.disabled = searching;
}

type PopupReason =
	| "share"
	| "settings"
	| "advanced"
	| "help"
	| "about"
	| "welcome";
export async function togglePopup(reason?: PopupReason) {
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
			}#${State.currentRelationId.get()}`;

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
				.event("click", openID)
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
				.id("open-with-container")
				.children(iDButton, josmButton)
				.build();

			popup.append(container, openWithContainer);

			copyButton.addEventListener("click", () => {
				navigator.clipboard.writeText(shareText).then(() => {
					copyIcon.classList.remove("fa-copy");
					copyIcon.classList.add("fa-check");
				});
			});

			iDButton.addEventListener("click", () => openID);
			josmIcon.addEventListener("click", openJOSM);

			break;
		}
		case "settings": {
			const list = new ElementBuilder("div").id("settings-list").build();

			Settings.keys().forEach(key => {
				const setting = Settings.getObject(key);
				if (!setting.inSettings) return;

				const settingDescription = setting.description;
				const isBoolean = typeof setting.value === "boolean";

				const heading = new ElementBuilder("h3")
					.text(setting.name)
					.build();
				const text = new ElementBuilder("p")
					.class("setting-title")
					.text(settingDescription)
					.build();

				const inputBox = new ElementBuilder("input")
					.class("setting-input")
					.inputType(isBoolean ? "checkbox" : "text")
					.attribute("data-setting", key)
					.event("change", e => {
						const target = e.target as HTMLInputElement;
						Settings.set(
							target.getAttribute(
								"data-setting"
							) as keyof SettingsObject,
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

	// setHTMLSizes();
	popup.showModal();
}

export function displayPopup(
	element: { wayId: number; path: Path2D },
	way: OverpassWay
) {
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
	Object.entries(way.tags ?? {}).forEach(([tag, value]) => {
		const tagCell = new ElementBuilder("td").text(tag.toString()).build();
		const valueCell = new ElementBuilder("td")
			.text(value.toString())
			.build();
		const tagRow = new ElementBuilder("tr")
			.children(tagCell, valueCell)
			.build();

		wayInfoTags.append(tagRow);
	});

	wayInfo.removeAttribute("hidden");
	State.selectedWay.set(way.id);
}

export function openID() {
	window.open(
		`https://www.openstreetmap.org/relation/${State.currentRelationId.get()}`,
		"_blank",
		"noreferrer noopener"
	);
}

export function editID() {
	window.open(
		`https://www.openstreetmap.org/edit?way=${State.selectedWay.get()}`,
		"_blank",
		"noreferrer noopener"
	);
}

export function openJOSM() {
	const { minLat, maxLat, minLon, maxLon } = State.multiplier.get();
	const url = `127.0.0.1:8111/load_and_zoom?left=${minLon}&right=${maxLon}&top=${maxLat}&bottom=${minLat}&select=relation${State.currentRelationId.get()}`;
	fetch(url);
}
