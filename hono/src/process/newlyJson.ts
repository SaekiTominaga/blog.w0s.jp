import fs from 'node:fs';
import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
import MarkdownTitle from '../../../remark/dist/Title.js';
import configHono from '../config/hono.ts';
import configNewlyJson from '../config/newlyJson.ts';
import NewlyJson from '../db/NewlyJson.ts';
import { brotliCompressText } from '../util/compress.ts';
import type { Normal as ProcessResult } from '../../@types/process.d.ts';
import type { NewlyEntry } from '../../@types/view.d.ts';

const logger = Log4js.getLogger('NewlyJson');

/**
 * 新着 JSON ファイル生成
 *
 * @returns ファイル生成情報
 */
const create = async (): Promise<ProcessResult> => {
	try {
		const dao = new NewlyJson(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`, {
			readonly: true,
		});

		const datasCatgroup = new Map<string, readonly NewlyEntry[]>();

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
