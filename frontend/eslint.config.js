// @ts-check

import w0sConfig from '@w0s/eslint-config';

/** @type {import("eslint").Linter.Config[]} */
export default [
	...w0sConfig,
	{
		ignores: ['public/script/*.js', 'public/script/*.mjs'],
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'sort-imports': [
				'error',
				{
					ignoreDeclarationSort: true,
				},
			],
		},
	},
	{
		files: ['build/**/*.ts'],
		rules: {
			'no-console': 'off',
			'import/extensions': [
				'error',
				'ignorePackages',
				{
					pattern: {
						js: 'never',
					},
					pathGroupOverrides: [
						{
							pattern: '../../media/dist/**',
							action: 'ignore',
						},
					],
				},
			],
		},
	},
	{
		files: ['script/**/*.ts'],
		rules: {
			'@typescript-eslint/no-misused-promises': [
				'error',
				{
					checksVoidReturn: false,
				},
			],
		},
	},
	{
		files: ['script/analytics.ts'],
		languageOptions: {
			parserOptions: {
				sourceType: 'script',
			},
		},
		rules: {
			'no-implicit-globals': 'off',
			'no-multi-assign': 'off',
			'no-underscore-dangle': 'off',
			'no-var': 'off',
		},
	},
	{
		files: ['script/trusted-types.ts'],
		languageOptions: {
			parserOptions: {
				sourceType: 'script',
			},
		},
		rules: {
			strict: 'off',
		},
	},
];
