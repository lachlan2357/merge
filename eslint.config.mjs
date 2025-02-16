import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import ts from "typescript-eslint";

const jsdocConfig = [
	jsdoc.configs["flat/recommended-typescript"],
	{
		files: ["**/*.ts"],
		plugins: { jsdoc },
		rules: {
			"jsdoc/tag-lines": "off",
			"jsdoc/require-throws": "warn",
			"jsdoc/require-description": "warn",
			"jsdoc/require-description-complete-sentence": "warn",
			"jsdoc/sort-tags": "warn"
		}
	}
];

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
		"@typescript-eslint/no-array-constructor": "off",
		"@typescript-eslint/no-unused-vars": "off"
	}
};

const config = [
	js.configs.recommended,
	...ts.configs.recommended,
	jsdocConfig,
	prettier,
	customConfig
];

export default ts.config(...config);
