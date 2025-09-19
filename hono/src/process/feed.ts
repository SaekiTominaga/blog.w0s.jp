import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import Log4js from 'log4js';
import { format, resolveConfig } from 'prettier';
import xmlFormatter from 'xml-formatter';
import { env } from '@w0s/env-value-type';
import configFeed from '../config/feed.ts';
import configHono from '../config/hono.ts';
import BlogFeedDao from '../dao/BlogFeedDao.ts';
import Markdown from '../markdown/Markdown.ts';
import { brotliCompressText } from '../util/compress.ts';

const logger = Log4js.getLogger('Feed');

/**
 * フィード生成
 *
 * @returns ファイル生成情報
 */
const create = async (): Promise<Process.Result> => {
	try {
		const dao = new BlogFeedDao(env('SQLITE_BLOG'));

		const entriesDto = await dao.getEntries(configFeed.limit);

		const entriesView = await Promise.all(
			entriesDto.map(
				async (entry): Promise<BlogView.FeedEntry> => ({
					id: entry.id,
					title: entry.title,
					description: entry.description,
					message: (await new Markdown().toHtml(entry.message)).value.toString(),
					updatedAt: dayjs(entry.updatedAt ?? entry.registedAt),
					update: Boolean(entry.updatedAt),
				}),
			),
		);

		const feed = await ejs.renderFile(`${env('VIEWS')}/${configFeed.template}`, {
			updatedAt: entriesView.at(0)?.updatedAt,
			entries: entriesView,
		});

		let feedHtmlFormatted = feed;
		const prettierOptions = await resolveConfig('test.html', { editorconfig: true });
		if (prettierOptions !== null) {
			feedHtmlFormatted = await format(feed, prettierOptions);
		}

		const feedXmlFormatted = xmlFormatter(feedHtmlFormatted, {
			/* https://github.com/chrisbottin/xml-formatter#options */
			indentation: '\t',
			collapseContent: true,
			lineSeparator: '\n',
		});

		const feedXmlBrotli = await brotliCompressText(feedXmlFormatted);

		/* ファイル出力 */
		const filePath = `${configHono.static.root}/${configFeed.path}`;
		const brotliFilePath = `${filePath}.br`;

		await Promise.all([fs.promises.writeFile(filePath, feedXmlFormatted), fs.promises.writeFile(brotliFilePath, feedXmlBrotli)]);
		logger.info('Feed file created success', filePath, brotliFilePath);

		return { success: true, message: configFeed.processMessage.success };
	} catch (e) {
		logger.error(e);

		return { success: false, message: configFeed.processMessage.failure };
	}
};

export default create;
