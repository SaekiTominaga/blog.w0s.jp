import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
// eslint-disable-next-line import/extensions
import Markdown from '@blog.w0s.jp/remark/dist/Markdown.js';
import configFeed from '../config/feed.ts';
import configHono from '../config/hono.ts';
import FeedDao from '../db/Feed.ts';
import { brotliCompressText } from '../util/compress.ts';
import type { Normal as ProcessResult } from '../../@types/process.ts';
import type { FeedEntry } from '../../@types/view.ts';

const logger = Log4js.getLogger('Feed');

/**
 * フィード生成
 *
 * @returns ファイル生成情報
 */
const create = async (): Promise<ProcessResult> => {
	try {
		const dao = new FeedDao(env('SQLITE_BLOG'), {
			readonly: true,
		});

		const entriesDto = await dao.getEntries(configFeed.limit);

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

		const feed = await ejs.renderFile(`${env('VIEWS')}/${configFeed.template}`, {
			updatedAt: entriesView.at(0)?.updatedAt,
			entries: entriesView,
		});

		const feedXmlBrotli = await brotliCompressText(feed);

		/* ファイル出力 */
		const filePath = `${configHono.static.root}/${configFeed.path}`;
		const brotliFilePath = `${filePath}.br`;

		await Promise.all([fs.promises.writeFile(filePath, feed), fs.promises.writeFile(brotliFilePath, feedXmlBrotli)]);
		logger.info('Feed file created success', filePath, brotliFilePath);

		return { success: true, message: configFeed.processMessage.success };
	} catch (e) {
		logger.error(e);

		return { success: false, message: configFeed.processMessage.failure };
	}
};

export default create;
