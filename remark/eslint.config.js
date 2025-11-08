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
		files: ['src/hast/**/*.ts', 'src/toHast/**/*.ts', 'src/toMdast/**/*.ts'],
		rules: {
			'arrow-body-style': 'off',
		},
	},
	{
		files: ['src/toHast/**/*.ts'],
		rules: {
			'import/prefer-default-export': 'off',
		},
	},
	{
		files: ['src/toMdast/**/*.ts'],
		rules: {
			'no-invalid-this': 'off',
			'jsdoc/require-jsdoc': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
		},
	},
	{
		files: ['src/Markdown.ts'],
		rules: {
			'lines-between-class-members': 'off',
			'no-await-in-loop': 'off',
			'no-continue': 'off',
		},
	},
];
