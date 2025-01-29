import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import { format, resolveConfig } from 'prettier';
import xmlFormatter from 'xml-formatter';
import BlogFeedDao from '../dao/BlogFeedDao.js';
import configExpress from '../config/express.js';
import Markdown from '../markdown/Markdown.js';
import Compress from '../util/Compress.js';
import { env } from '../util/env.js';
import type { NoName as Configure } from '../../../configure/type/feed.js';

/**
 * フィード生成
 */
export default class CreateFeed {
	readonly #config: Configure; // 機能設定

	constructor() {
		this.#config = JSON.parse(fs.readFileSync('configure/feed.json', 'utf8')) as Configure;
	}

	/**
	 * @returns ファイル生成情報
	 */
	async execute(): Promise<{
		createdFilesPath: string[]; // 生成したファイルパス
	}> {
		const dao = new BlogFeedDao(env('SQLITE_BLOG'));

		const entriesDto = await dao.getEntries(this.#config.limit);

		const entriesView = new Set<BlogView.FeedEntry>();
		await Promise.all(
			entriesDto.map(async (entry) => {
				entriesView.add({
					id: entry.id,
					title: entry.title,
					description: entry.description,
					message: (await new Markdown().toHtml(entry.message)).value.toString(),
					updated_at: dayjs(entry.updated_at ?? entry.created_at),
					update: Boolean(entry.updated_at),
				});
			}),
		);

		const feedUnformat = await ejs.renderFile(`${env('VIEWS')}/${this.#config.view_path}`, {
			updated_at: [...entriesView].at(0)?.updated_at,
			entries: entriesView,
		});
		let feed = feedUnformat;

		const prettierOptions = await resolveConfig('test.html', { editorconfig: true });
		if (prettierOptions !== null) {
			feed = await format(feedUnformat, prettierOptions);
		}

		const feedXmlFormatted = xmlFormatter(feed, {
			/* https://github.com/chrisbottin/xml-formatter#options */
			indentation: '\t',
			collapseContent: true,
			lineSeparator: '\n',
		});

		const feedXmlBrotli = Compress.brotliText(feedXmlFormatted);

		/* ファイル出力 */
		const filePath = `${configExpress.static.root}/${this.#config.path}`;
		const brotliFilePath = `${filePath}.br`;

		await Promise.all([fs.promises.writeFile(filePath, feedXmlFormatted), fs.promises.writeFile(brotliFilePath, feedXmlBrotli)]);

		return {
			createdFilesPath: [filePath, brotliFilePath],
		};
	}
}
