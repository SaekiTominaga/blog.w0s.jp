import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import slash from 'slash';
import { loadConfig, optimize } from 'svgo';

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
const filesPath = slash(`${argsParsedValues.inDir}/**/*.svg`);
const outDirectory = slash(argsParsedValues.outDir);
const configFilePath = slash(argsParsedValues.config);

const config = await loadConfig(configFilePath);

const files = fs.promises.glob(filesPath);

for await (const file of files) {
	/* ファイル読み込み */
	const fileData = (await fs.promises.readFile(file)).toString();

	/* SVG 最適化 */
	const optimized = optimize(fileData.replace(/<svg version="([0-9.]+)"/, '<svg').replace(' id="レイヤー_1"', ''), config);

	/* 出力 */
	const outFileParse = path.parse(file.replace(new RegExp(`^${argsParsedValues.inDir}`), outDirectory));
	const outExtension = outFileParse.dir === outDirectory && outFileParse.base === 'favicon.svg' ? '.ico' : '.svg'; // favicon.svg のみ favicon.ico にリネームする
	const outPath = `${outFileParse.dir}/${outFileParse.name}${outExtension}`;

	/* 出力 */
	await fs.promises.writeFile(outPath, optimized.data);
	console.info(`SVG file optimized: ${outPath}`);
}
