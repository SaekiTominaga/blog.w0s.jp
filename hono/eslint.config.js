// @ts-check

import w0sConfig from '@w0s/eslint-config';

/** @type {import("eslint").Linter.Config[]} */
export default [
	...w0sConfig,
	{
		ignores: ['dist'],
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'import/extensions': [
				'error',
				'ignorePackages',
				{
					pattern: {
						js: 'never',
					},
					pathGroupOverrides: [
						{
							pattern: '../../../remark/dist/**',
							action: 'ignore',
						},
					],
				},
			],
			'import/no-extraneous-dependencies': [
				'error',
				{
					packageDir: ['../', './'],
				},
			],
		},
	},
	{
		files: ['src/db/**/*.ts'],
		rules: {
			'@typescript-eslint/no-non-null-assertion': 'off',
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
