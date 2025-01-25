import { Setting } from "./state.js";
import { BooleanSetting, UrlSetting } from "./types.js";

const settingsStorage = {
	leftHandTraffic: new Setting<boolean>(
		"Left Hand Traffic",
		"Whether the traffic drives on the left-hand-side of the road, for example in the UK, Australia, Japan, etc.",
		new BooleanSetting(false),
		true,
		true
	),
	endpoint: new Setting<URL>(
		"Overpass Endpoint",
		"The address of the Overpass Endpoint to use.",
		new UrlSetting("https://overpass-api.de/api/interpreter"),
		true,
		true
	),
	ignoreCache: new Setting<boolean>(
		"Ignore Cache",
		"Whether to disregard the cache for the next request. Must be toggled on for each request.",
		new BooleanSetting(false),
		false,
		true
	),
	darkMode: new Setting<boolean>(
		"Dark Mode",
		"Whether to use the dark theme for the application.",
		new BooleanSetting(window.matchMedia("(prefers-color-scheme: dark)").matches),
		true,
		true
	),
	firstLaunch: new Setting<boolean>(
		"First Launch",
		"Whether it is the first time using the application.",
		new BooleanSetting(true),
		true,
		false
	)
} as const;

type SettingsObject = typeof settingsStorage;
type SettingsKey = keyof SettingsObject;
type SettingType<K extends SettingsKey> = SettingsObject[K] extends Setting<infer T> ? T : never;

export function get<K extends SettingsKey>(key: K): SettingType<K> {
	const setting = settingsStorage[key];
	return setting.value.value as SettingType<K>;
}

export function getObject<K extends SettingsKey>(key: K): SettingsObject[K] {
	return settingsStorage[key];
}

export function set<K extends SettingsKey>(key: K, value: SettingType<K>) {
	const setting = settingsStorage[key] as Setting<SettingType<K>>;
	setting.value.value = value;
}

export function keys() {
	return Object.keys(settingsStorage) as Array<SettingsKey>;
}
