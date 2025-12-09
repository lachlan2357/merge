import { BooleanSetting, UrlSetting } from "./containers.js";
/** Underlying structure storing all application settings. */ const settingsStorage = {
    /** Setting to control whether traffic should be drawn driven on the left or not. */ leftHandTraffic: new BooleanSetting("Left Hand Traffic", "left-hand-traffic", "Whether the traffic drives on the left-hand-side of the road, for example in the UK, Australia, Japan, etc.", false, true, true),
    /** Setting to control the endpoint for the Overpass API. */ endpoint: new UrlSetting("Overpass Endpoint", "overpass-endpoint", "The address of the Overpass Endpoint to use.", new URL("https://overpass-api.de/api/interpreter"), true, true),
    /** Setting to control whether to ignore the cache when making a request to the Overpass API. */ ignoreCache: new BooleanSetting("Ignore Cache", "ignore-cache", "Whether to disregard the cache for the next request. Must be toggled on for each request.", false, false, true),
    /** Setting to control whether the theme should be dark mode. */ darkMode: new BooleanSetting("Dark Mode", "dark-mode", "Whether to use the dark theme for the application.", window.matchMedia("(prefers-color-scheme: dark)").matches, true, true, (value)=>document.documentElement.setAttribute("data-dark-mode", value.toString())),
    /** Setting to control whether this launch of the application is the first launch. */ firstLaunch: new BooleanSetting("First Launch", "first-launch", "Whether it is the first time using the application.", true, true, false)
};
/**
 * Retrieve the current value of a setting.
 *
 * @param key The key of the setting to retrieve.
 * @returns The current value of the setting.
 */ export function get(key) {
    const setting = settingsStorage[key];
    return setting.value;
}
/**
 * Retrieve the {@link Setting} object for a setting.
 *
 * @param key The key of the setting to retrieve.
 * @returns The corresponding {@link Setting} object.
 */ export function getObject(key) {
    return settingsStorage[key];
}
/**
 * Set the value of a setting.
 *
 * @param key The key of the setting to set.
 * @param value The value of the setting to set.
 */ export function set(key, value) {
    const setting = settingsStorage[key];
    setting.value = value;
}
/**
 * Retrieve all valid settings keys.
 *
 * @returns All valid settings keys.
 */ export function keys() {
    return Object.keys(settingsStorage);
}
