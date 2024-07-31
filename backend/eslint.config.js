// @ts-check

import w0sConfig from '@w0s/eslint-config';

/** @type {import("@typescript-eslint/utils/ts-eslint").FlatConfig.ConfigArray} */
export default [
	...w0sConfig,
	{
		ignores: ['node/dist/**/*.js'],
	},
	{
		files: ['node/src/markdown/**/*.ts'],
		rules: {
			'arrow-body-style': 'off',
		},
	},
	{
		files: ['node/src/controller/**/*.ts'],
		rules: {
			'@typescript-eslint/dot-notation': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
		},
	},
	{
		files: ['node/src/dao/**/*.ts'],
		rules: {
			'@typescript-eslint/no-non-null-assertion': 'off',
		},
	},
	{
		files: ['node/src/markdown/toHast/**/*.ts'],
		rules: {
			'import/prefer-default-export': 'off',
		},
	},
	{
		files: ['node/src/markdown/toMdast/**/*.ts'],
		rules: {
			'no-invalid-this': 'off',
			'jsdoc/require-jsdoc': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
		},
	},
	{
		files: ['node/src/markdown/Markdown.ts'],
		rules: {
			'lines-between-class-members': 'off',
			'no-await-in-loop': 'off',
			'no-continue': 'off',
		},
	},
	{
		files: ['node/src/process/test/*.ts'],
		rules: {
			'no-console': 'off',
		},
	},
	{
		files: ['node/src/shell/*.ts'],
		rules: {
			'no-await-in-loop': 'off',
			'no-console': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
		},
	},
	{
		files: ['node/src/util/RequestUtil.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-return': 'off',
		},
	},
	{
		files: ['node/src/app.ts'],
		rules: {
			'@typescript-eslint/no-misused-promises': 'off',
		},
	},
	{
		files: ['node/src/*Interface.ts'],
		rules: {
			semi: 'off',
		},
	},
];
