import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import Log4js from 'log4js';
import xmlFormatter from 'xml-formatter';
import configHono from '../config/hono.js';
import configSitemap from '../config/sitemap.js';
import BlogSitemapDao from '../dao/BlogSitemapDao.js';
import { env } from '../util/env.js';

const logger = Log4js.getLogger('Sitemap');

/**
 * サイトマップ生成
 *
 * @returns 処理結果
 */
const create = async (): Promise<Process.Result> => {
	try {
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
		const filePath = `${configHono.static.root}/${configSitemap.path}`;

		await fs.promises.writeFile(filePath, sitemapXmlFormated);

		logger.info('Sitemap file created success', filePath);

		return { success: true, message: configSitemap.processMessage.success };
	} catch (e) {
		logger.error(e);

		return { success: false, message: configSitemap.processMessage.failure };
	}
};

export default create;
