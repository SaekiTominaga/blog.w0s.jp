import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const inputDir = 'script';
const outputDir = 'public/script';

const moduleFiles = ['blog.ts', 'error.ts', 'admin.ts'];
const jsFiles = ['trusted-types.ts'];
const legacyFiles = ['analytics.ts'];

const pluginCommonjs = commonjs();
const pluginResolve = resolve();
const pluginTerser = process.env.build === 'production' ? terser() : undefined;
const pluginTypeScript = typescript({
	tsconfig: `${inputDir}/tsconfig.json`,
});

const moduleConfigurations = moduleFiles.map(
	(file) =>
		/** @type {import('rollup').RollupOptions} */
		({
			input: `${inputDir}/${file}`,
			plugins: [pluginCommonjs, pluginResolve, pluginTerser, pluginTypeScript],
			output: {
				dir: outputDir,
				sourcemap: true,
				entryFileNames: '[name].mjs',
			},
		}),
);

const jsConfigurations = jsFiles.map(
	(file) =>
		/** @type {import('rollup').RollupOptions} */
		({
			input: `${inputDir}/${file}`,
			plugins: [pluginTerser, pluginTypeScript],
			output: {
				dir: outputDir,
				sourcemap: true,
				format: 'iife',
			},
		}),
);

const legacyConfigurations = legacyFiles.map(
	(file) =>
		/** @type {import('rollup').RollupOptions} */
		({
			input: `${inputDir}/${file}`,
			plugins: [pluginTerser, pluginTypeScript],
			output: {
				dir: outputDir,
				sourcemap: true,
			},
		}),
);

export default moduleConfigurations.concat(jsConfigurations).concat(legacyConfigurations);
