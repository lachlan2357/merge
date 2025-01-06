const defaultSettings = {
    leftHandTraffic: {
        name: "Left Hand Traffic",
        description: "Whether the traffic drives on the left-hand-side of the road, for example in the UK, Australia, Japan, etc.",
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
        description: "Whether to disregard the cache for the next request. Must be toggled on for each request.",
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
function isSettingKey(key) {
    return Object.keys(defaultSettings).includes(key);
}
/** Interface directly with Local Storage for settings */
export class Settings {
    static settings = this.reload();
    static get(key) {
        const setting = this.settings[key];
        return setting.value;
    }
    static getObject(key) {
        const setting = this.settings[key];
        return setting;
    }
    static set(key, value) {
        const setting = this.settings[key];
        setting.value = value;
        this.save();
    }
    static keys() {
        return Object.keys(this.settings);
    }
    static save() {
        for (const keyString in this.settings) {
            const key = keyString;
            const setting = this.settings[key];
            window.localStorage.setItem(key, setting.value.toString());
        }
    }
    static reload() {
        const settings = structuredClone(defaultSettings);
        for (const key in settings) {
            if (!isSettingKey(key))
                continue;
            const value = window.localStorage.getItem(key);
            if (value === null)
                continue;
            if (typeof settings[key].value === "string")
                settings[key].value = value;
            else if (typeof settings[key].value === "boolean")
                settings[key].value = value === "true";
            else
                throw "Not a valid setting type";
        }
        return settings;
    }
}
