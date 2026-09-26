import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';
import prettier from 'rollup-plugin-prettier';

const inputDir = 'javascript/src';
const outputDir = '../public/script';

const moduleFiles = ['blog.ts', 'error.ts', 'admin.ts'];
const legacyFiles = ['analytics.ts'];

const pluginCommonjs = commonjs();
const pluginPrettier = prettier({
	parser: 'espree',
});
const pluginResolve = nodeResolve();
const pluginSucrase = sucrase({
	disableESTransforms: true,
	transforms: ['typescript'],
});

const moduleConfigs = moduleFiles.map(
	(file) =>
		/** @type {import('rollup').RollupOptions} */
		({
			input: `${inputDir}/${file}`,
			plugins: [pluginCommonjs, pluginResolve, pluginSucrase, pluginPrettier],
			output: {
				dir: outputDir,
				format: 'es',
				entryFileNames: '[name].mjs',
				generatedCode: 'es2015',
				minifyInternalExports: false,
				sourcemap: 'hidden',
			},
			strictDeprecations: true,
		}),
);

/** @type {import('rollup').RollupOptions} */
const legacyConfig = {
	input: legacyFiles.map((file) => `${inputDir}/${file}`),
	plugins: [pluginSucrase, pluginPrettier],
	output: {
		dir: outputDir,
		format: 'es',
		generatedCode: 'es2015',
		minifyInternalExports: false,
		sourcemap: 'hidden',
	},
	strictDeprecations: true,
};

export default [...moduleConfigs, legacyConfig];
