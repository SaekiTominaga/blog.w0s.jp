import fs from 'node:fs';
import Log4js from 'log4js';
import configHono from '../config/hono.ts';
import configNewlyJson from '../config/newlyJson.ts';
import BlogNewlyJsonDao from '../dao/BlogNewlyJsonDao.ts';
import MarkdownTitle from '../markdown/Title.ts';
import { brotliCompressText } from '../util/compress.ts';
import { env } from '../util/env.ts';

const logger = Log4js.getLogger('NewlyJson');

/**
 * 新着 JSON ファイル生成
 *
 * @returns ファイル生成情報
 */
const create = async (): Promise<Process.Result> => {
	try {
		const dao = new BlogNewlyJsonDao(env('SQLITE_BLOG'));

		const datasCatgroup = new Map<string, BlogView.NewlyEntry[]>();

		datasCatgroup.set('', await dao.getEntries(configNewlyJson.limit));

		await Promise.all(
			(await dao.getCategoryGroupMasterFileName()).map(async (fileName) => {
				datasCatgroup.set(fileName, await dao.getEntries(configNewlyJson.limit, fileName));
			}),
		);

		await Promise.all(
			[...datasCatgroup].map(async ([fileNameType, datas]) => {
				const newlyJson = JSON.stringify(
					datas.map((data) => ({
						id: data.id,
						title: new MarkdownTitle(data.title).mark(),
					})),
				);

				const newlyJsonBrotli = await brotliCompressText(newlyJson);

				/* ファイル出力 */
				const fileName =
					fileNameType === '' ? configNewlyJson.filename.prefix : `${configNewlyJson.filename.prefix}${configNewlyJson.filename.separator}${fileNameType}`;
				const filePath = `${configHono.static.root}/${configNewlyJson.directory}/${fileName}${configHono.extension.json}`;
				const brotliFilePath = `${filePath}${configHono.extension.brotli}`;

				await Promise.all([fs.promises.writeFile(filePath, newlyJson), fs.promises.writeFile(brotliFilePath, newlyJsonBrotli)]);
				logger.info('JSON file created success', filePath, brotliFilePath);
			}),
		);

		return { success: true, message: configNewlyJson.processMessage.success };
	} catch (e) {
		logger.error(e);

		return { success: false, message: configNewlyJson.processMessage.failure };
	}
};

export default create;
