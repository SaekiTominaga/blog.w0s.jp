import fs from 'node:fs';
import { env } from '@w0s/env-value-type';
import configHono from '../config/hono.ts';
import configProcess from '../config/process.ts';
import NewlyJson from '../db/NewlyJson.ts';
import { brotliCompressText } from '../util/compress.ts';
import type { NewlyEntry } from '../../@types/view.d.ts';
import MarkdownTitle from '../../../remark/dist/Title.js';

/**
 * 新着 JSON ファイル生成
 *
 * @returns 生成したファイルパス
 */
export const create = async (): Promise<string[]> => {
	const dao = new NewlyJson(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`, {
		readonly: true,
	});

	const datasCatgroup = new Map<string, readonly NewlyEntry[]>();

	datasCatgroup.set('', await dao.getEntries(configProcess.newlyJson.limit));

	await Promise.all(
		(await dao.getCategoryGroupMasterFileName()).map(async (fileName) => {
			datasCatgroup.set(fileName, await dao.getEntries(configProcess.newlyJson.limit, fileName));
		}),
	);

	const createdFiles = await Promise.all(
		[...datasCatgroup].map(async ([fileNameType, datas]) => {
			const newlyJson = JSON.stringify(
				datas.map((data) => ({
					id: data.id,
					title: new MarkdownTitle(data.title).mark(),
				})),
				undefined,
				'\t',
			);

			const newlyJsonBrotli = await brotliCompressText(newlyJson);

			/* ファイル出力 */
			const fileName =
				fileNameType === ''
					? configProcess.newlyJson.filename.prefix
					: `${configProcess.newlyJson.filename.prefix}${configProcess.newlyJson.filename.separator}${fileNameType}`;
			const filePath = `${configHono.static.root}/${configProcess.newlyJson.directory}/${fileName}${configHono.extension.json}`;
			const brotliFilePath = `${filePath}${configHono.extension.brotli}`;

			await Promise.all([fs.promises.writeFile(filePath, newlyJson), fs.promises.writeFile(brotliFilePath, newlyJsonBrotli)]);

			return [filePath, brotliFilePath];
		}),
	);

	return createdFiles.flat();
};
