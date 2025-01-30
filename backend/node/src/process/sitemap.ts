import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import xmlFormatter from 'xml-formatter';
import configExpress from '../config/express.js';
import configSitemap from '../config/sitemap.js';
import BlogSitemapDao from '../dao/BlogSitemapDao.js';
import { env } from '../util/env.js';

/**
 * サイトマップ生成
 *
 * @returns ファイル生成情報
 */
const create = async (): Promise<{
	file: string; // 生成したファイルパス
}> => {
	const dao = new BlogSitemapDao(env('SQLITE_BLOG'));

	const [updated, entries] = await Promise.all([
		dao.getLastModified(),
		dao.getEntries(configSitemap.limit /* TODO: 厳密にはこの上限数から個別記事以外の URL 数を差し引いた数にする必要がある */),
	]);

	const sitemapXml = await ejs.renderFile(`${env('VIEWS')}/${configSitemap.template}`, {
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
	const filePath = `${configExpress.static.root}/${configSitemap.path}`;

	await fs.promises.writeFile(filePath, sitemapXmlFormated);

	return {
		file: filePath,
	};
};

export default create;
