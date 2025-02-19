import { ExpectMatcherState, MatcherReturnType, Page } from "@playwright/test";
import * as lib from "lib/index.ts";

type ExtensionObject = Record<string, ExtensionFunction>;
type ExtensionFunction = (
	this: ExpectMatcherState,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	receiver: any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	...args: any[]
) => MatcherReturnType | Promise<MatcherReturnType>;

interface ToString {
	toString(): string;
}

export const localStorageExtensions = {
	async toHaveLocalStorageValue(page: Page, key: string, expected: ToString | undefined) {
		// retrieve current state of localStorage
		const ls = await lib.getLocalStorage(page);
		const storedValue = ls[key];
		const passedValue = expected?.toString();

		// determine if values match
		const name = "localStorageValueToBe";
		const pass = storedValue === passedValue;
		const message = () =>
			this.utils.matcherHint(name, storedValue, passedValue) +
			"\n\n" +
			`key: ${key}\n` +
			this.utils.printDiffOrStringify(passedValue, storedValue, "expected", "received", true);

		return {
			message,
			pass,
			name,
			expected,
			actual: storedValue
		};
	}
} satisfies ExtensionObject;
