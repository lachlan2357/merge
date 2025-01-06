import { ElementBuilder } from "../elements.js";
import { Settings } from "../settings.js";
import { Popup } from "./index.js";
export class SettingsPopup extends Popup {
    build() {
        const heading = new ElementBuilder("h2").text("Settings").build();
        const list = new ElementBuilder("div").id("settings-list").build();
        const keys = Settings.keys();
        for (let i = 0, n = keys.length; i < n; i++) {
            const key = keys[i];
            const setting = Settings.getObject(key);
            if (!setting.inSettings)
                continue;
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
                const target = e.target;
                Settings.set(target.getAttribute("data-setting"), target.getAttribute("type") == "checkbox" ? target.checked : target.value);
            });
            if (typeof setting.value === "boolean")
                inputBox.inputChecked(setting.value);
            else
                inputBox.inputValue(setting.value);
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
        return [heading, list];
    }
}
export const SETTINGS_POPUP = new SettingsPopup();
