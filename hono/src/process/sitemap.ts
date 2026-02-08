import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
import configHono from '../config/hono.ts';
import configSitemap from '../config/sitemap.ts';
import SitemapDao from '../db/Sitemap.ts';
import type { Normal as ProcessResult } from '../../@types/process.d.ts';
import type { SitemapEntry } from '../../@types/view.d.ts';

const logger = Log4js.getLogger('Sitemap');

/**
 * サイトマップ生成
 *
 * @returns 処理結果
 */
const create = async (): Promise<ProcessResult> => {
	try {
		const dao = new SitemapDao(`${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`, {
			readonly: true,
		});

		const [updated, entriesDto] = await Promise.all([
			dao.getLastModified(),
			dao.getEntries(configSitemap.limit /* TODO: 厳密にはこの上限数から個別記事以外の URL 数を差し引いた数にする必要がある */),
		]);

		const entriesView = entriesDto.map(
			(entry): SitemapEntry => ({
				id: entry.id,
				updatedAt: dayjs(entry.updated_at ?? entry.registed_at),
			}),
		);
		const sitemapXml = await ejs.renderFile(`${env('ROOT')}/${env('TEMPLATE_DIR')}/${configSitemap.template}`, {
			updatedAt: dayjs(updated),
			entries: entriesView,
		});

		/* ファイル出力 */
		const filePath = `${configHono.static.root}/${configSitemap.path}`;

		await fs.promises.writeFile(filePath, sitemapXml);

		logger.info('Sitemap file created success', filePath);

		return { success: true, message: configSitemap.processMessage.success };
	} catch (e) {
		logger.error(e);

		return { success: false, message: configSitemap.processMessage.failure };
	}
};

export default create;
