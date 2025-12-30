import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

const inputDir = 'script';
const outputDir = '../public/script';

const moduleFiles = ['blog.ts', 'error.ts', 'admin.ts'];
const legacyFiles = ['analytics.ts'];

const pluginCommonjs = commonjs();
const pluginResolve = nodeResolve();
const pluginTypeScript = typescript({
	tsconfig: `${inputDir}/tsconfig.json`,
	outputToFilesystem: true,
});

const moduleConfigs = moduleFiles.map(
	(file) =>
		/** @type {import('rollup').RollupOptions} */
		({
			input: `${inputDir}/${file}`,
			plugins: [pluginCommonjs, pluginResolve, pluginTypeScript],
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
	plugins: [pluginTypeScript],
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
