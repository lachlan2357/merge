import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import ts from "typescript-eslint";

/** @type{Linter.RulesRecord} */
const customConfig = {
	languageOptions: {
		globals: {
			...globals.browser
		},

		parser: ts.parser,
		ecmaVersion: "latest",
		sourceType: "module"
	},

	rules: {
		"@typescript-eslint/no-array-constructor": "off"
	}
};

export default ts.config(js.configs.recommended, ...ts.configs.recommended, prettier, customConfig);
