import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import { env } from '@w0s/env-value-type';
import configHono from '../config/hono.ts';
import configProcess from '../config/process.ts';
import SitemapDao from '../db/Sitemap.ts';
import type { SitemapEntry } from '../../@types/view.d.ts';

/**
 * サイトマップ生成
 *
 * @returns 生成したファイルパス
 */
export const create = async (): Promise<string[]> => {
	const dao = new SitemapDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`, {
		readonly: true,
	});

	const [updated, entriesDto] = await Promise.all([
		dao.getLastModified(),
		dao.getEntries(configProcess.sitemap.limit /* TODO: 厳密にはこの上限数から個別記事以外の URL 数を差し引いた数にする必要がある */),
	]);

	const entriesView = entriesDto.map(
		(entry): SitemapEntry => ({
			id: entry.id,
			updatedAt: dayjs(entry.updated_at ?? entry.registed_at),
		}),
	);
	const sitemapXml = await ejs.renderFile(`${env('ROOT')}/${env('TEMPLATE_DIR')}/${configProcess.sitemap.template}`, {
		updatedAt: dayjs(updated),
		entries: entriesView,
	});

	/* ファイル出力 */
	const filePath = `${configHono.static.root}/${configProcess.sitemap.path}`;

	await fs.promises.writeFile(filePath, sitemapXml);

	return [filePath];
};
