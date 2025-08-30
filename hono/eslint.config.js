// @ts-check

import w0sConfig from '@w0s/eslint-config';

/** @type {import("@typescript-eslint/utils/ts-eslint").FlatConfig.ConfigArray} */
export default [
	...w0sConfig,
	{
		ignores: ['dist/**/*.js'],
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		files: ['src/markdown/**/*.ts'],
		rules: {
			'arrow-body-style': 'off',
		},
	},
	{
		files: ['src/markdown/toHast/**/*.ts'],
		rules: {
			'import/prefer-default-export': 'off',
		},
	},
	{
		files: ['src/markdown/toMdast/**/*.ts'],
		rules: {
			'no-invalid-this': 'off',
			'jsdoc/require-jsdoc': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
		},
	},
	{
		files: ['src/markdown/Markdown.ts'],
		rules: {
			'lines-between-class-members': 'off',
			'no-await-in-loop': 'off',
			'no-continue': 'off',
		},
	},
	{
		files: ['src/shell/*.ts'],
		rules: {
			'no-await-in-loop': 'off',
			'no-console': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
		},
	},
	{
		files: ['src/util/**/*.ts'],
		rules: {
			'func-style': [
				'error',
				'expression',
				{
					overrides: {
						namedExports: 'ignore',
					},
				},
			],
		},
	},
];
