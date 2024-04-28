import fs from 'node:fs';
import path from 'node:path';
import slash from 'slash';
import { loadConfig, optimize } from 'svgo';
import BuildComponent from '../BuildComponent.js';
import type BuildComponentInterface from '../BuildComponentInterface.js';

/**
 * SVG ビルド
 */
export default class Svg extends BuildComponent implements BuildComponentInterface {
	async execute(args: string[]): Promise<void> {
		const filePathOs = args.at(0);
		const configFilePath = args.at(1);
		if (filePathOs === undefined || configFilePath === undefined) {
			throw new Error('Missing parameter');
		}
		const filePath = slash(filePathOs);

		const svg = (await fs.promises.readFile(filePath)).toString();

		const svgOptimized = optimize(svg.replace(/<svg version="([0-9.]+)"/, '<svg').replace(' id="レイヤー_1"', ''), await loadConfig(configFilePath));

		/* 出力 */
		const distFileParse = path.parse(filePath.replace(new RegExp(`^${this.config.image.directory}`), this.config.static.root));
		const distExtension = distFileParse.dir === this.config.static.root && distFileParse.base === 'favicon.svg' ? '.ico' : '.svg'; // favicon.svg のみ favicon.ico にリネームする
		const distPath = `${distFileParse.dir}/${distFileParse.name}${distExtension}`;

		await fs.promises.writeFile(distPath, svgOptimized.data);
		console.info(`SVG file created: ${distPath}`);
	}
}
