export const settings = {
	"Left Hand Traffic": {
		description:
			"Switch to driving on the left for countries such as the UK, Australia, Japan, etc.",
		inputType: "boolean",
		value: false,
		setLocalStorage: true,
		inSettings: true,
	},
	"Endpoint": {
		description:
			"Use a different Overpass endpoint. Default endpoint is https://overpass-api.de/api/interpreter.",
		inputType: "string",
		value: "https://overpass-api.de/api/interpreter",
		setLocalStorage: true,
		inSettings: true,
	},
	"Ignore Cache": {
		description:
			"Don't used cached data. Must be toggled on for each request.",
		inputType: "boolean",
		value: false,
		setLocalStorage: false,
		inSettings: true,
	},
	"Dark Mode": {
		description: "Not light mode.",
		inputType: "boolean",
		value: window.matchMedia("(prefers-color-scheme:dark)").matches,
		setLocalStorage: true,
		inSettings: true,
	},
	"First Launch": {
		description: "First time using the application",
		inputType: "boolean",
		value: true,
		setLocalStorage: true,
		inSettings: false,
	},
};

export function getSetting(settingName: string): string {
	const setting = settings[settingName];

	if (setting.setLocalStorage) {
		return window.localStorage.getItem(settingName) || "";
	} else {
		return setting.value.toString();
	}
}

export function setSetting(settingName: string, value: string | boolean) {
	const setting = settings[settingName];

	if (setting.setLocalStorage) {
		window.localStorage.setItem(settingName, value.toString());
	} else {
		settings[settingName].value = value;
	}

	settingUpdate();
}

export function settingUpdate() {
	document.documentElement.setAttribute(
		"darkmode",
		getSetting("Dark Mode").toString()
	);
}

//localStorage setup
Object.keys(settings).forEach(settingName => {
	const setting = settings[settingName];
	if (setting.setLocalStorage && !window.localStorage.getItem(settingName)) {
		window.localStorage.setItem(settingName, setting.value.toString());
	}
});
