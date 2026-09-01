import { defineConfig } from 'oxlint';
import config from '@w0s/oxlint-config/node';

export default defineConfig({
	extends: [config],
	rules: {
		'no-console': 'off',
		'import/no-nodejs-modules': 'off',
	},
});
