// @ts-check

import w0sConfig from '@w0s/eslint-config';

/** @type {import("eslint").Linter.Config[]} */
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
