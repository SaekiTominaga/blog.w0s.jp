import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const baseDir = 'public/script';
const inputDir = `${baseDir}/_src`;
const outputDir = `${baseDir}`;

const moduleFiles = ['blog.ts', 'error.ts', 'admin.ts'];
const jsFiles = ['trusted-types.ts'];
const legacyFiles = ['analytics.ts'];

const pluginTypeScript = typescript({
	tsconfig: `${baseDir}/tsconfig.json`,
});
const pluginResolve = resolve();
const pluginTerser = terser();

const moduleConfigurations = moduleFiles.map((file) => ({
	input: `${inputDir}/${file}`,
	plugins: [pluginTypeScript, pluginResolve, pluginTerser],
	output: {
		dir: outputDir,
		sourcemap: 'hidden',
		entryFileNames: '[name].mjs',
	},
}));
const jsConfigurations = jsFiles.map((file) => ({
	input: `${inputDir}/${file}`,
	plugins: [pluginTypeScript, pluginTerser],
	output: {
		dir: outputDir,
		sourcemap: 'hidden',
		format: 'iife',
	},
}));
const legacyConfigurations = legacyFiles.map((file) => ({
	input: `${inputDir}/${file}`,
	plugins: [pluginTypeScript, pluginTerser],
	output: {
		dir: outputDir,
		sourcemap: 'hidden',
	},
}));

export default moduleConfigurations.concat(jsConfigurations).concat(legacyConfigurations);
