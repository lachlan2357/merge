import { Setting } from "../index.js";

export interface SettingMap {
	leftHandTraffic: boolean;
	endpoint: string;
	ignoreCache: boolean;
	darkMode: boolean;
	firstLaunch: boolean;
}

export type SettingName = keyof SettingMap;
export type SettingsObject = {
	[key in keyof SettingMap]: Setting<SettingMap[key]>;
};

export class Settings {
	settings: SettingsObject;

	constructor() {
		this.settings = this.loadAll();
		this.saveAll();
	}

	loadString(key: SettingName): string | undefined {
		const item = localStorage.getItem(key);
		if (!item) return undefined;
		else return item;
	}

	loadBoolean(key: SettingName): boolean | undefined {
		const item = localStorage.getItem(key);
		if (!item) return undefined;
		else return item === "true";
	}

	loadAll(): SettingsObject {
		const tempSettings: SettingsObject = defaultSettings;

		tempSettings.leftHandTraffic.value =
			this.loadBoolean("leftHandTraffic") ??
			tempSettings.leftHandTraffic.value;
		tempSettings.endpoint.value =
			this.loadString("endpoint") ?? tempSettings.endpoint.value;
		tempSettings.ignoreCache.value =
			this.loadBoolean("ignoreCache") ?? tempSettings.ignoreCache.value;
		tempSettings.darkMode.value =
			this.loadBoolean("darkMode") ?? tempSettings.darkMode.value;
		tempSettings.firstLaunch.value =
			this.loadBoolean("firstLaunch") ?? tempSettings.firstLaunch.value;

		return tempSettings;
	}

	saveAll() {
		this.keys().map(key => {
			const setting = this.getFull(key);
			localStorage.setItem(key, setting.value.toString());
		});
		this.onUpdate();
	}

	set<K extends SettingName>(key: K, value: SettingMap[K]) {
		console.log("setting");
		this.settings[key].value = value;
		this.saveAll();
	}

	reset<K extends SettingName>(key: K) {
		this.settings[key] = defaultSettings[key];
		this.saveAll();
	}

	get<K extends SettingName>(key: K): SettingMap[K] {
		return this.settings[key].value as SettingMap[K];
	}

	getFull<K extends SettingName>(key: K): Setting<SettingMap[K]> {
		return this.settings[key];
	}

	isString(setting: Setting<string | boolean>): setting is Setting<string> {
		return typeof setting.value === "string";
	}

	isKey(str: string): str is SettingName {
		return Object.keys(this.settings).includes(str);
	}

	keys() {
		return [
			"darkMode",
			"endpoint",
			"firstLaunch",
			"ignoreCache",
			"leftHandTraffic",
		] as Array<SettingName>;
	}

	onUpdate() {
		document.documentElement.setAttribute(
			"darkmode",
			this.get("darkMode").toString()
		);
	}
}

const defaultSettings: SettingsObject = {
	leftHandTraffic: {
		name: "Left Hand Traffic",
		description:
			"Switch to driving on the left for countries such as the UK, Australia, Japan, etc.",
		inputType: "boolean",
		value: false,
		setLocalStorage: true,
		inSettings: true,
	},
	endpoint: {
		name: "Endpoint",
		description:
			"Use a different Overpass endpoint. Default endpoint is https://overpass-api.de/api/interpreter.",
		inputType: "string",
		value: "https://overpass-api.de/api/interpreter",
		setLocalStorage: true,
		inSettings: true,
	},
	ignoreCache: {
		name: "Ignore Cache",
		description:
			"Don't used cached data. Must be toggled on for each request.",
		inputType: "boolean",
		value: false,
		setLocalStorage: false,
		inSettings: true,
	},
	darkMode: {
		name: "Dark Mode",
		description: "Not light mode.",
		inputType: "boolean",
		value: false,
		setLocalStorage: true,
		inSettings: true,
	},
	firstLaunch: {
		name: "First Launch",
		description: "First time using the application",
		inputType: "boolean",
		value: true,
		setLocalStorage: true,
		inSettings: false,
	},
};
