import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { watch as chokidarWatch } from 'chokidar';
import slash from 'slash';
import { type Output as SvgoOutput, optimize as svgOptimize, loadConfig as svgoLoadConfig } from 'svgo';
import { iec } from '@w0s/file-size-format';
import { create as createThumbImage } from '../../media/dist/thumbImage.js';

/**
 * SVG ビルド
 */

/* 引数処理 */
const argsParsedValues = parseArgs({
	options: {
		srcDir: {
			type: 'string',
			short: 's',
		},
		distDir: {
			type: 'string',
			short: 'd',
		},
		svgoConfig: {
			type: 'string',
		},
		watch: {
			type: 'boolean',
			short: 'w',
			default: false,
		},
	},
}).values;

if (argsParsedValues.srcDir === undefined) {
	throw new Error('Argument `srcDir` not specified');
}
if (argsParsedValues.distDir === undefined) {
	throw new Error('Argument `distDir` not specified');
}
if (argsParsedValues.svgoConfig === undefined) {
	throw new Error('Argument `svgoConfig` not specified');
}
const { srcDir, distDir, svgoConfig: svgoConfigFilePath, watch } = argsParsedValues;

const svgoConfig = await svgoLoadConfig(svgoConfigFilePath);

const getDistFilePath = (srcFilePath: string): string => srcFilePath.replace(new RegExp(`^${srcDir}`, 'v'), distDir);

const exec = async (srcFilePath: string): Promise<void> => {
	const distFilePath = getDistFilePath(srcFilePath);

	switch (path.extname(srcFilePath)) {
		case '.jpg': {
			const srcFileData = await fs.promises.readFile(srcFilePath);

			await fs.promises.copyFile(srcFilePath, distFilePath);
			console.info(`JPEG file copyed: ${distFilePath}`);

			const createdThumbImages = await createThumbImage(
				{
					buffer: srcFileData,
					fileName: path.basename(srcFilePath),
				},
				{
					dir: path.dirname(distFilePath),
					dimensions: [
						{ maxWidth: 160, maxHeight: 160 }, // Amazon 商品画像
					],
					densityQualities: [
						{ density: 1, quality: 60 },
						{ density: 2, quality: 30 },
					],
				},
			);
			createdThumbImages.forEach((createdFile) => {
				console.info(
					`JPEG thumbnail file created: ${createdFile.name} (${iec(srcFileData.byteLength, { digits: 1 })} → ${iec(createdFile.size, { digits: 1 })})`,
				);
			});

			break;
		}
		case '.svg': {
			/* ファイル読み込み */
			const srcFileData = await fs.promises.readFile(srcFilePath);

			/* SVG 最適化 */
			let optimized: SvgoOutput;
			try {
				optimized = svgOptimize(
					srcFileData
						.toString()
						.replace(/<svg version="([0-9.]+)"/v, '<svg')
						.replace(' id="レイヤー_1"', ''),
					svgoConfig,
				);
			} catch (e) {
				if (e instanceof Error && e.name === 'SvgoParserError') {
					// @ts-expect-error: ts(2339)
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					console.warn(`[${e.name}] ${e.reason} <${srcFilePath}>`);
					return;
				}
				throw e;
			}

			/* 出力 */
			await fs.promises.writeFile(distFilePath, optimized.data);
			console.info(`SVG file optimized: ${distFilePath}`);
			break;
		}
		default: {
			await fs.promises.copyFile(srcFilePath, distFilePath);
			console.info(`File copyed: ${distFilePath}`);
		}
	}
};

if (watch) {
	{
		const removePaths = await Array.fromAsync(fs.promises.glob([`${distDir}/image/*.svg.br`, `${distDir}/*.svg.br`]));

		await Promise.all(removePaths.map((removePath) => fs.promises.rm(removePath, { recursive: true })));
		console.info(`Files removed`, removePaths);
	}

	chokidarWatch(srcDir)
		.on('add', (srcFilePath) => {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			exec(srcFilePath);
		})
		.on('change', (srcFilePath) => {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			exec(srcFilePath);
		});
} else {
	{
		const distExcludePaths = ['entry', 'json', 'script', 'style', 'feed.atom', 'feed.atom.br', 'sitemap.xml']; // 別のスクリプトで自動生成するディレクトリ、ファイル

		const removePaths = (
			await Array.fromAsync(
				fs.promises.glob(`${distDir}/*`, {
					exclude: distExcludePaths.map((excludePath) => `${distDir}/${excludePath}`),
					withFileTypes: true,
				}),
			)
		).map((resource) => slash(path.relative(process.cwd(), `${resource.parentPath}/${resource.name}`)));

		await Promise.all(removePaths.map((removePath) => fs.promises.rm(removePath, { recursive: true })));
		console.info(`Directories and files removed`, removePaths);
	}

	const srcFilePaths = (await Array.fromAsync(fs.promises.glob(`${srcDir}/**`, { withFileTypes: true })))
		.filter((resource) => resource.isFile())
		.map((file) => slash(path.relative(process.cwd(), `${file.parentPath}/${file.name}`)));

	const distNoExistDirectories = [...new Set(srcFilePaths.map((srcFilePath) => path.dirname(getDistFilePath(srcFilePath))))].filter(
		(dir) => !fs.existsSync(dir),
	);

	await Promise.all(distNoExistDirectories.map(async (distNoExistDirectory) => fs.promises.mkdir(distNoExistDirectory, { recursive: true })));
	console.info(`Directory created:`, distNoExistDirectories);

	await Promise.all(
		srcFilePaths.map(async (filePath) => {
			await exec(filePath);
		}),
	);
}
