import { defineConfig } from 'oxlint';
import configFrontend from './frontend/oxlint.config.ts';
import configHono from './hono/oxlint.config.ts';
import configMedia from './media/oxlint.config.ts';
import configRemark from './remark/oxlint.config.ts';

export default defineConfig({
	extends: [configFrontend, configHono, configMedia, configRemark],
	options: {
		typeAware: true,
		typeCheck: true,
	},
});
