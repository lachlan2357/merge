import { BooleanSetting, UrlSetting } from "./containers.js";
const settingsStorage = {
    leftHandTraffic: new BooleanSetting("Left Hand Traffic", "left-hand-traffic", "Whether the traffic drives on the left-hand-side of the road, for example in the UK, Australia, Japan, etc.", false, true, true),
    endpoint: new UrlSetting("Overpass Endpoint", "overpass-endpoint", "The address of the Overpass Endpoint to use.", new URL("https://overpass-api.de/api/interpreter"), true, true),
    ignoreCache: new BooleanSetting("Ignore Cache", "ignore-cache", "Whether to disregard the cache for the next request. Must be toggled on for each request.", false, false, true),
    darkMode: new BooleanSetting("Dark Mode", "dark-mode", "Whether to use the dark theme for the application.", window.matchMedia("(prefers-color-scheme: dark)").matches, true, true, value => document.documentElement.setAttribute("data-dark-mode", value.toString())),
    firstLaunch: new BooleanSetting("First Launch", "first-launch", "Whether it is the first time using the application.", true, true, false)
};
export function get(key) {
    const setting = settingsStorage[key];
    return setting.value;
}
export function getObject(key) {
    return settingsStorage[key];
}
export function set(key, value) {
    const setting = settingsStorage[key];
    setting.value = value;
}
export function keys() {
    return Object.keys(settingsStorage);
}
