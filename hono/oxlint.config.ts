import { defineConfig } from 'oxlint';
import config from '@w0s/oxlint-config/node';

export default defineConfig({
	extends: [config],
	overrides: [
		{
			files: ['src/**/*.ts'],
			rules: {
				'node/no-process-env': 'off',
			},
		},
		{
			files: ['src/db/**/*.ts'],
			rules: {
				'typescript/no-non-null-assertion': 'off',
				'unicorn/no-null': 'off',
			},
		},
		{
			files: ['src/app.ts'],
			rules: {
				'node/callback-return': 'off',
				'promise/prefer-await-to-callbacks': 'off',
			},
		},
	],
});
