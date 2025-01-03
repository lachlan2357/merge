type Setting<T> = {
	name: string;
	description: string;
	value: T;
	setLocalStorage: boolean;
	inSettings: boolean;
};

export type SettingsObject = {
	leftHandTraffic: Setting<boolean>;
	endpoint: Setting<string>;
	ignoreCache: Setting<boolean>;
	darkMode: Setting<boolean>;
	firstLaunch: Setting<boolean>;
};

const defaultSettings: SettingsObject = {
	leftHandTraffic: {
		name: "Left Hand Traffic",
		description:
			"Whether the traffic drives on the left-hand-side of the road, for example in the UK, Australia, Japan, etc.",
		value: false,
		setLocalStorage: true,
		inSettings: true
	},
	endpoint: {
		name: "Overpass Endpoint",
		description: "The address of the Overpass Endpoint to use.",
		value: "https://overpass-api.de/api/interpreter",
		setLocalStorage: true,
		inSettings: true
	},
	ignoreCache: {
		name: "Ignore Cache",
		description:
			"Whether to disregard the cache for the next request. Must be toggled on for each request.",
		value: false,
		setLocalStorage: false,
		inSettings: true
	},
	darkMode: {
		name: "Dark Mode",
		description: "Whether to use the dark theme for the application.",
		value: window.matchMedia("(prefers-color-scheme: dark)").matches,
		setLocalStorage: true,
		inSettings: true
	},
	firstLaunch: {
		name: "First Launch",
		description: "Whether it is the first time using the application.",
		value: true,
		setLocalStorage: true,
		inSettings: false
	}
};

type SettingType<K extends keyof SettingsObject> =
	SettingsObject[K] extends Setting<infer T> ? T : never;

function isSettingKey(key: string): key is keyof SettingsObject {
	return Object.keys(defaultSettings).includes(key);
}

/** Interface directly with Local Storage for settings */
export class Settings {
	private static settings = this.reload();

	static get<K extends keyof SettingsObject>(key: K): SettingType<K> {
		const setting = this.settings[key];
		return setting.value as SettingType<K>;
	}

	static getObject<K extends keyof SettingsObject>(key: K): Setting<SettingType<K>> {
		const setting = this.settings[key];
		return setting as Setting<SettingType<K>>;
	}

	static set<K extends keyof SettingsObject>(key: K, value: SettingType<K>) {
		const setting = this.settings[key];
		setting.value = value as typeof setting.value;
		this.save();
	}

	static keys() {
		return Object.keys(this.settings) as Array<keyof SettingsObject>;
	}

	private static save() {
		for (const keyString in this.settings) {
			const key = keyString as keyof SettingsObject;
			const setting = this.settings[key];
			window.localStorage.setItem(key, setting.value.toString());
		}
	}

	private static reload() {
		const settings = structuredClone(defaultSettings);

		for (const key in settings) {
			if (!isSettingKey(key)) continue;

			const value = window.localStorage.getItem(key);
			if (value === null) continue;

			if (typeof settings[key].value === "string") settings[key].value = value;
			else if (typeof settings[key].value === "boolean")
				settings[key].value = value === "true";
			else throw "Not a valid setting type";
		}

		return settings;
	}
}
