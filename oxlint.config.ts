import { defineConfig } from 'oxlint';
import configFrontendBuild from './frontend/build/oxlint.config.ts';
import configFrontendJavaScript from './frontend/javascript/oxlint.config.ts';
import configHono from './hono/oxlint.config.ts';
import configMedia from './media/oxlint.config.ts';
import configRemark from './remark/oxlint.config.ts';

export default defineConfig({
	extends: [configFrontendBuild, configFrontendJavaScript, configHono, configMedia, configRemark],
	options: {
		typeAware: true,
		typeCheck: true,
	},
});
