import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import { format, resolveConfig } from 'prettier';
import xmlFormatter from 'xml-formatter';
import configExpress from '../config/express.js';
import configFeed from '../config/feed.js';
import BlogFeedDao from '../dao/BlogFeedDao.js';
import Markdown from '../markdown/Markdown.js';
import Compress from '../util/Compress.js';
import { env } from '../util/env.js';

/**
 * フィード生成
 *
 * @returns ファイル生成情報
 */
const create = async (): Promise<{
	files: string[]; // 生成したファイルパス
}> => {
	const dao = new BlogFeedDao(env('SQLITE_BLOG'));

	const entriesDto = await dao.getEntries(configFeed.limit);

	const entriesView = await Promise.all(
		entriesDto.map(
			async (entry): Promise<BlogView.FeedEntry> => ({
				id: entry.id,
				title: entry.title,
				description: entry.description,
				message: (await new Markdown().toHtml(entry.message)).value.toString(),
				updated_at: dayjs(entry.updated_at ?? entry.created_at),
				update: Boolean(entry.updated_at),
			}),
		),
	);

	const feed = await ejs.renderFile(`${env('VIEWS')}/${configFeed.template}`, {
		updated_at: entriesView.at(0)?.updated_at,
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

	const feedXmlBrotli = Compress.brotliText(feedXmlFormatted);

	/* ファイル出力 */
	const filePath = `${configExpress.static.root}/${configFeed.path}`;
	const brotliFilePath = `${filePath}.br`;

	await Promise.all([fs.promises.writeFile(filePath, feedXmlFormatted), fs.promises.writeFile(brotliFilePath, feedXmlBrotli)]);

	return {
		files: [filePath, brotliFilePath],
	};
};

export default create;
