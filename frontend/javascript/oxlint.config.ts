import { defineConfig } from 'oxlint';
import config from '@w0s/oxlint-config/browser';

export default defineConfig({
	extends: [config],
	rules: {
		'import/unambiguous': 'off',
	},
	overrides: [
		{
			files: ['src/admin.ts'],
			rules: {
				'promise/prefer-await-to-callbacks': 'off', // TODO: 暫定
				'promise/prefer-await-to-then': 'off', // TODO: 暫定
			},
		},
		{
			files: ['src/analytics.ts'],
			rules: {
				'no-implicit-globals': 'off',
				'no-multi-assign': 'off',
				'no-underscore-dangle': 'off',
				'no-unused-vars': [
					'error',
					{
						varsIgnorePattern: 'Window',
					},
				],
				'no-var': 'off',
			},
		},
	],
});
