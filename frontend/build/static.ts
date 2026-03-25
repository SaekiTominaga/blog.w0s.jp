import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
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

const exec = async (srcFilePath: string): Promise<void> => {
	const distFilePath = srcFilePath.replace(new RegExp(`^${srcDir}`, 'v'), distDir);
	const distFileDirectory = path.dirname(distFilePath);

	if (!fs.existsSync(distFileDirectory)) {
		await fs.promises.mkdir(distFileDirectory, { recursive: true });
		console.info(`Directory created: ${distFileDirectory}`);
	}

	switch (path.extname(srcFilePath)) {
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

const srcFilePaths = (await Array.fromAsync(fs.promises.glob(`${srcDir}/**`, { withFileTypes: true })))
	.filter((resource) => resource.isFile())
	.map((file) => slash(path.relative(process.cwd(), `${file.parentPath}/${file.name}`)));

if (watch) {
	chokidarWatch(srcFilePaths).on('change', (srcFilePath) => {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		exec(srcFilePath);
	});
} else {
	const excludePaths = ['entry', 'json', 'script', 'style', 'feed.atom', 'feed.atom.br', 'sitemap.xml']; // 別のスクリプトで自動生成するディレクトリ、ファイル

	const removePaths = (
		await Array.fromAsync(
			fs.promises.glob(`${distDir}/*`, {
				exclude: excludePaths.map((excludePath) => `${distDir}/${excludePath}`),
				withFileTypes: true,
			}),
		)
	).map((resource) => slash(path.relative(process.cwd(), `${resource.parentPath}/${resource.name}`)));

	await Promise.all(removePaths.map((removePath) => fs.promises.rm(removePath, { recursive: true })));
	console.info(`Directories and files removed`, removePaths);

	await Promise.all(
		srcFilePaths.map(async (filePath) => {
			await exec(filePath);
		}),
	);
}
