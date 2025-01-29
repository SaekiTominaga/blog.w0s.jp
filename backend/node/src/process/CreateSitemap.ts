import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import xmlFormatter from 'xml-formatter';
import configExpress from '../config/express.js';
import BlogSitemapDao from '../dao/BlogSitemapDao.js';
import { env } from '../util/env.js';
import type { NoName as Configure } from '../../../configure/type/sitemap.js';

/**
 * サイトマップ生成
 */
export default class CreateSitemap {
	readonly #config: Configure; // 機能設定

	constructor() {
		this.#config = JSON.parse(fs.readFileSync('configure/sitemap.json', 'utf8')) as Configure;
	}

	/**
	 * @returns ファイル生成情報
	 */
	async execute(): Promise<{
		createdFilePath: string; // 生成したファイルパス
	}> {
		const dao = new BlogSitemapDao(env('SQLITE_BLOG'));

		const [updated, entries] = await Promise.all([
			dao.getLastModified(),
			dao.getEntries(this.#config.limit /* TODO: 厳密にはこの上限数から個別記事以外の URL 数を差し引いた数にする必要がある */),
		]);

		const sitemapXml = await ejs.renderFile(`${env('VIEWS')}/${this.#config.view_path}`, {
			updated_at: dayjs(updated),
			entries: entries,
		});

		const sitemapXmlFormated = xmlFormatter(sitemapXml, {
			/* https://github.com/chrisbottin/xml-formatter#options */
			indentation: '\t',
			collapseContent: true,
			lineSeparator: '\n',
		});

		/* ファイル出力 */
		const filePath = `${configExpress.static.root}/${this.#config.path}`;

		await fs.promises.writeFile(filePath, sitemapXmlFormated);

		return {
			createdFilePath: filePath,
		};
	}
}
