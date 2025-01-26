import { Setting } from "./containers.js";
import { BooleanSetting, UrlSetting } from "./containers.js";

const settingsStorage = {
	leftHandTraffic: new BooleanSetting(
		"Left Hand Traffic",
		"left-hand-traffic",
		"Whether the traffic drives on the left-hand-side of the road, for example in the UK, Australia, Japan, etc.",
		false,
		true,
		true
	),
	endpoint: new UrlSetting(
		"Overpass Endpoint",
		"overpass-endpoint",
		"The address of the Overpass Endpoint to use.",
		new URL("https://overpass-api.de/api/interpreter"),
		true,
		true
	),
	ignoreCache: new BooleanSetting(
		"Ignore Cache",
		"ignore-cache",
		"Whether to disregard the cache for the next request. Must be toggled on for each request.",
		false,
		false,
		true
	),
	darkMode: new BooleanSetting(
		"Dark Mode",
		"dark-mode",
		"Whether to use the dark theme for the application.",
		window.matchMedia("(prefers-color-scheme: dark)").matches,
		true,
		true,
		value => document.documentElement.setAttribute("darkmode", value.toString())
	),
	firstLaunch: new BooleanSetting(
		"First Launch",
		"first-launch",
		"Whether it is the first time using the application.",
		true,
		true,
		false
	)
} as const;

type SettingsObject = typeof settingsStorage;
type SettingsKey = keyof SettingsObject;
type SettingType<K extends SettingsKey> = SettingsObject[K] extends Setting<infer T> ? T : never;

export function get<K extends SettingsKey>(key: K): SettingType<K> {
	const setting = settingsStorage[key];
	return setting.value as unknown as SettingType<K>;
}

export function getObject<K extends SettingsKey>(key: K): SettingsObject[K] {
	return settingsStorage[key];
}

export function set<K extends SettingsKey>(key: K, value: SettingType<K>) {
	const setting = settingsStorage[key] as unknown as Setting<SettingType<K>>;
	setting.value = value;
}

export function keys() {
	return Object.keys(settingsStorage) as Array<SettingsKey>;
}
