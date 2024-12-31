import { ElementBuilder, FontAwesomeIcon, LinkChip } from "../elements.js";
import { Settings, SettingsObject } from "../settings.js";
import { State } from "../state.js";
import { OverpassWay } from "../types/overpass.js";
import { getElement } from "./elements.js";

export const POPUP = getElement("popup", HTMLDialogElement);
export const WAY_INFO = getElement("way-info", HTMLDivElement);
export const WAY_INFO_ID = getElement("wayid", HTMLHeadingElement);
export const WAY_INFO_TAGS = getElement("tags", HTMLTableElement);

type PopupReason = "share" | "settings" | "advanced" | "help" | "about" | "welcome";

export async function togglePopup(reason?: PopupReason) {
	if (POPUP.open) {
		POPUP.setAttribute("closing", "");
		POPUP.addEventListener(
			"animationend",
			() => {
				POPUP.removeAttribute("closing");
				POPUP.close();
			},
			{ once: true }
		);
		return;
	}

	while (POPUP.lastChild) POPUP.lastChild.remove();

	if (reason != "welcome") POPUP.append(new ElementBuilder("h2").text(reason ?? "").build());

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

			const share = new ElementBuilder("span").class("share").text(shareText).build();

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

			POPUP.append(container, openWithContainer);

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

			const keys = Settings.keys();
			for (let i = 0, n = keys.length; i < n; i++) {
				const key = keys[i];

				const setting = Settings.getObject(key);
				if (!setting.inSettings) continue;

				const settingDescription = setting.description;
				const isBoolean = typeof setting.value === "boolean";

				const heading = new ElementBuilder("h3").text(setting.name).build();
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
							target.getAttribute("data-setting") as keyof SettingsObject,
							target.getAttribute("type") == "checkbox"
								? target.checked
								: target.value
						);
					});

				if (typeof setting.value === "boolean") inputBox.inputChecked(setting.value);
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
			}

			POPUP.append(list);

			break;
		}
		case "help": {
			const help = new ElementBuilder("p").text("Coming soon. Stay Tuned.").build();
			POPUP.append(help);
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

			POPUP.append(description, chip);
			break;
		}
		case "advanced": {
			const advanced = new ElementBuilder("p").text("Coming soon. Stay Tuned.").build();
			POPUP.append(advanced);
			break;
		}
		case "welcome": {
			const img = new ElementBuilder("img").id("welcome-img").src("/merge/icon.png").build();

			const heading = new ElementBuilder("h2").id("welcome-heading").text("Merge").build();

			const description = new ElementBuilder("p")
				.text(
					"Welcome to Merge! To get started, use the search box to lookup a relation by either RelationID or name. Note: once each request has successfully returned information, the data is cached and when requested again, it pulls from the cache. To re-request data, toggle the options in settings."
				)
				.build();

			POPUP.append(img, heading, description);
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

	POPUP.append(closeButton);

	// setHTMLSizes();
	POPUP.showModal();
}

export function displayPopup(element: { wayId: number; path: Path2D }, way: OverpassWay) {
	WAY_INFO_ID.innerHTML = `Way <a href="https://www.openstreetmap.org/way/${element.wayId}" target="_blank">${element.wayId}</a>`;

	// purge all children before adding new ones
	while (WAY_INFO_TAGS.lastChild) WAY_INFO_TAGS.removeChild(WAY_INFO_TAGS.lastChild);

	// create heading row
	const tagHeading = new ElementBuilder("th").text("Tag").build();
	const valueHeading = new ElementBuilder("th").text("Value").build();

	const row = new ElementBuilder("tr").children(tagHeading, valueHeading).build();

	WAY_INFO_TAGS.append(row);

	// content rows
	Object.entries(way.tags ?? {}).forEach(([tag, value]) => {
		const tagCell = new ElementBuilder("td").text(tag.toString()).build();
		const valueCell = new ElementBuilder("td").text(value.toString()).build();
		const tagRow = new ElementBuilder("tr").children(tagCell, valueCell).build();

		WAY_INFO_TAGS.append(tagRow);
	});

	WAY_INFO.removeAttribute("hidden");
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
