import { defineConfig } from 'oxlint';
import config from '@w0s/oxlint-config/node';

export default defineConfig({
	extends: [config],
	options: {
		typeAware: true,
		typeCheck: true,
	},
	overrides: [
		{
			files: ['src/hast/**/*.ts', 'src/toHast/**/*.ts', 'src/toMdast/**/*.ts'],
			rules: {
				'arrow-body-style': 'off',
			},
		},
		{
			files: ['src/hast/**/*.ts', 'src/toHast/**/*.ts'],
			rules: {
				'jsdoc/require-param': 'off',
				'jsdoc/require-returns': 'off',
			},
		},
		{
			files: ['src/toMdast/**/*.ts'],
			rules: {
				'typescript/no-unsafe-assignment': 'off',
				'typescript/no-unsafe-call': 'off',
				'typescript/no-unsafe-member-access': 'off',
			},
		},
		{
			files: ['src/shell/*.ts'],
			rules: {
				'no-console': 'off',
			},
		},
	],
});
