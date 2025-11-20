import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { watch as chokidarWatch } from 'chokidar';
import slash from 'slash';
import { loadConfig as svgoLoadConfig, optimize as svgOptimize, type Output as SvgoOutput } from 'svgo';

/**
 * SVG ビルド
 */

/* 引数処理 */
const argsParsedValues = parseArgs({
	options: {
		inDir: {
			type: 'string',
			short: 'i',
		},
		outDir: {
			type: 'string',
			short: 'o',
		},
		config: {
			type: 'string',
			short: 'c',
		},
		watch: {
			type: 'boolean',
			short: 'w',
			default: false,
		},
	},
}).values;

if (argsParsedValues.inDir === undefined) {
	throw new Error('Argument `inDir` not specified');
}
if (argsParsedValues.outDir === undefined) {
	throw new Error('Argument `outDir` not specified');
}
if (argsParsedValues.config === undefined) {
	throw new Error('Argument `config` not specified');
}
const inDirectory = slash(argsParsedValues.inDir);
const outDirectory = slash(argsParsedValues.outDir);
const configFilePath = slash(argsParsedValues.config);
const { watch } = argsParsedValues;

const svgoConfig = await svgoLoadConfig(configFilePath);

const optimize = async (filePathTemp: string): Promise<void> => {
	const filePath = slash(filePathTemp);

	/* ファイル読み込み */
	const fileData = (await fs.promises.readFile(filePath)).toString();

	/* SVG 最適化 */
	let optimized: SvgoOutput;
	try {
		optimized = svgOptimize(fileData.replace(/<svg version="([0-9.]+)"/v, '<svg').replace(' id="レイヤー_1"', ''), svgoConfig);
	} catch (e) {
		if (e instanceof Error && e.name === 'SvgoParserError') {
			// @ts-expect-error: ts(2339)
			console.warn('[Error]', e.reason, `<${filePath}>`);
			return;
		}
		throw e;
	}

	const outFileParsed = path.parse(filePath.replace(new RegExp(`^${inDirectory}`, 'v'), outDirectory));
	const outExtension = '.svg';
	const outPath = `${outFileParsed.dir}/${outFileParsed.name}${outExtension}`;

	/* 出力 */
	await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
	await fs.promises.writeFile(outPath, optimized.data);
	console.info(`SVG file optimized: ${outPath}`);
};

const targetFiles = await Array.fromAsync(fs.promises.glob(`${inDirectory}/**/*.svg`));
if (watch) {
	chokidarWatch(targetFiles).on('change', (filePath) => {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		optimize(filePath);
	});
} else {
	await Promise.all(
		targetFiles.map(async (filePath) => {
			await optimize(filePath);
		}),
	);
}
