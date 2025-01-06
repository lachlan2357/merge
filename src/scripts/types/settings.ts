export interface Setting<T> {
	name: string;
	description: string;
	inputType: "string" | "boolean";
	value: T;
	setLocalStorage: boolean;
	inSettings: boolean;
}

export type SettingType = string | boolean;
