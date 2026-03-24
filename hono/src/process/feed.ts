import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import { env } from '@w0s/env-value-type';
import configHono from '../config/hono.ts';
import configProcess from '../config/process.ts';
import FeedDao from '../db/Feed.ts';
import { brotliCompressText } from '../util/compress.ts';
import type { FeedEntry } from '../../@types/view.d.ts';
import Markdown from '../../../remark/dist/Markdown.js';

/**
 * フィード生成
 *
 * @returns 生成したファイルパス
 */
export const create = async (): Promise<string[]> => {
	const dao = new FeedDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`, {
		readonly: true,
	});

	const entriesDto = await dao.getEntries(configProcess.feed.limit);

	const entriesView = await Promise.all(
		entriesDto.map(
			async (entry): Promise<FeedEntry> => ({
				id: entry.id,
				title: entry.title,
				description: entry.description,
				message: (await new Markdown().toHtml(entry.message)).value.toString(),
				updatedAt: dayjs(entry.updated_at ?? entry.registed_at),
				update: Boolean(entry.updated_at),
			}),
		),
	);

	const feed = await ejs.renderFile(`${env('ROOT')}/${env('TEMPLATE_DIR')}/${configProcess.feed.template}`, {
		updatedAt: entriesView.at(0)?.updatedAt,
		entries: entriesView,
	});

	const feedXmlBrotli = await brotliCompressText(feed);

	/* ファイル出力 */
	const filePath = `${configHono.static.root}/${configProcess.feed.path}`;
	const brotliFilePath = `${filePath}${configHono.extension.brotli}`;

	await Promise.all([fs.promises.writeFile(filePath, feed), fs.promises.writeFile(brotliFilePath, feedXmlBrotli)]);

	return [filePath, brotliFilePath];
};
