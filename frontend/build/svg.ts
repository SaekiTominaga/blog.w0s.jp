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

const files = await Array.fromAsync(fs.promises.glob(filesPath));

await Promise.all(
	files.map(async (filePath) => {
		/* ファイル読み込み */
		const fileData = (await fs.promises.readFile(filePath)).toString();

		/* SVG 最適化 */
		const optimized = optimize(fileData.replace(/<svg version="([0-9.]+)"/v, '<svg').replace(' id="レイヤー_1"', ''), config);

		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		const outFileParsed = path.parse(filePath.replace(new RegExp(`^${argsParsedValues.inDir}`, 'v'), outDirectory));
		const outExtension = outFileParsed.dir === outDirectory && outFileParsed.base === 'favicon.svg' ? '.ico' : '.svg'; // favicon.svg のみ favicon.ico にリネームする
		const outPath = `${outFileParsed.dir}/${outFileParsed.name}${outExtension}`;

		/* 出力 */
		await fs.promises.writeFile(outPath, optimized.data);
		console.info(`SVG file optimized: ${outPath}`);
	}),
);
