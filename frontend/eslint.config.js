import w0sConfig from '@w0s/eslint-config';

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
	...w0sConfig,
	{
		ignores: ['public/script/*.js', 'public/script/*.mjs'],
	},
	{
		files: ['build/**/*.js'],
		rules: {
			'no-console': 'off',
		},
	},
	{
		files: ['script/**/*.ts'],
		rules: {
			'@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
			'@typescript-eslint/no-unnecessary-condition': 'off',
		},
	},
	{
		files: ['script/*.ts'],
		rules: {
			'no-new': 'off',
		},
	},
	{
		files: ['script/trusted-types.ts'],
		languageOptions: {
			parserOptions: {
				sourceType: 'script',
			},
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
			'no-multi-assign': 'off',
			'no-underscore-dangle': 'off',
			'no-var': 'off',
			strict: 'off',
		},
	},
	{
		files: ['rollup.config.js'],
		rules: {
			'import/no-extraneous-dependencies': 'off',
		},
	},
];
