import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import prettier from 'prettier';
import xmlFormatter from 'xml-formatter';
import PrettierUtil from '@blog.w0s.jp/util/dist/PrettierUtil.js';
import BlogFeedDao from '../dao/BlogFeedDao.js';
import Markdown from '../markdown/Markdown.js';
import Compress from '../util/Compress.js';
import type { NoName as Configure } from '../../../configure/type/feed.js';

/**
 * フィード生成
 */
export default class CreateNewlyJson {
	#config: Configure;

	constructor() {
		this.#config = JSON.parse(fs.readFileSync('configure/feed.json', 'utf8'));
	}

	/**
	 * @param configCommon 共通設定ファイル
	 * @param configCommon.dbFilePath DB ファイルパス
	 * @param configCommon.views テンプレートディレクトリ
	 * @param configCommon.prettierConfig Prettier 構成ファイルパス
	 * @param configCommon.root ルートディレクトリ
	 *
	 * @returns ファイル生成情報
	 */
	async execute(configCommon: { dbFilePath: string; views: string; prettierConfig: string; root: string }): Promise<{
		createdFilesPath: string[]; // 生成したファイルパス
	}> {
		const dao = new BlogFeedDao(configCommon.dbFilePath);

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

		const feedXml = await ejs.renderFile(`${configCommon.views}/${this.#config.view_path}`, {
			updated_at: [...entriesView].at(0)?.updated_at,
			entries: entriesView,
		});

		const prettierOptions = PrettierUtil.configOverrideAssign(await PrettierUtil.loadConfig(configCommon.prettierConfig), '*.html');

		const feedXmlFormatted = xmlFormatter((await prettier.format(feedXml, prettierOptions)), {
			/* https://github.com/chrisbottin/xml-formatter#options */
			indentation: '\t',
			collapseContent: true,
			lineSeparator: '\n',
		});

		const feedXmlBrotli = Compress.brotliText(feedXmlFormatted);

		/* ファイル出力 */
		const filePath = `${configCommon.root}/${this.#config.path}`;
		const brotliFilePath = `${filePath}.br`;

		await Promise.all([fs.promises.writeFile(filePath, feedXmlFormatted), fs.promises.writeFile(brotliFilePath, feedXmlBrotli)]);

		return {
			createdFilesPath: [filePath, brotliFilePath],
		};
	}
}
