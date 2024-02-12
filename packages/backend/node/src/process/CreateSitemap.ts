import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import xmlFormatter from 'xml-formatter';
import BlogSitemapDao from '../dao/BlogSitemapDao.js';
import type { NoName as Configure } from '../../../configure/type/sitemap.js';

/**
 * サイトマップ生成
 */
export default class CreateSitemap {
	#config: Configure;

	constructor() {
		this.#config = JSON.parse(fs.readFileSync('configure/sitemap.json', 'utf8'));
	}

	/**
	 * @param configCommon 共通設定ファイル
	 * @param configCommon.dbFilePath DB ファイルパス
	 * @param configCommon.views テンプレートディレクトリ
	 * @param configCommon.root ルートディレクトリ
	 *
	 * @returns ファイル生成情報
	 */
	async execute(configCommon: { dbFilePath: string; views: string; root: string }): Promise<{
		createdFilePath: string; // 生成したファイルパス
	}> {
		const dao = new BlogSitemapDao(configCommon.dbFilePath);

		const [updated, entries] = await Promise.all([
			dao.getLastModified(),
			dao.getEntries(
				this.#config.limit /* TODO: 厳密にはこの上限数から個別記事以外の URL 数を差し引いた数にする必要がある */,
			),
		]);

		const sitemapXml = await ejs.renderFile(`${configCommon.views}/${this.#config.view_path}`, {
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
		const filePath = `${configCommon.root}/${this.#config.path}`;

		await fs.promises.writeFile(filePath, sitemapXmlFormated);

		return {
			createdFilePath: filePath,
		};
	}
}
