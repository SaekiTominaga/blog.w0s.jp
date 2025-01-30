import fs from 'node:fs';
import configExpress from '../config/express.js';
import configNewlyJson from '../config/newlyJson.js';
import BlogNewlyJsonDao from '../dao/BlogNewlyJsonDao.js';
import MarkdownTitle from '../markdown/Title.js';
import { brotliCompressText } from '../util/compress.js';
import { env } from '../util/env.js';

/**
 * 新着 JSON ファイル生成
 *
 * @returns ファイル生成情報
 */
const create = async (): Promise<{
	files: string[]; // 生成したファイルパス
}> => {
	const dao = new BlogNewlyJsonDao(env('SQLITE_BLOG'));

	const datasCatgroup = new Map<string, BlogView.NewlyEntry[]>();

	datasCatgroup.set('', await dao.getEntries(configNewlyJson.limit));

	await Promise.all(
		(await dao.getCategoryGroupMasterFileName()).map(async (fileName) => {
			datasCatgroup.set(fileName, await dao.getEntries(configNewlyJson.limit, fileName));
		}),
	);

	const createdFilesPath: string[] = [];

	await Promise.all(
		[...datasCatgroup].map(async ([fileNameType, datas]) => {
			const newlyJson = JSON.stringify(
				datas.map((data) => ({
					id: data.id,
					title: new MarkdownTitle(data.title).mark(),
				})),
			);

			const newlyJsonBrotli = brotliCompressText(newlyJson);

			/* ファイル出力 */
			const fileName =
				fileNameType === '' ? configNewlyJson.filename.prefix : `${configNewlyJson.filename.prefix}${configNewlyJson.filename.separator}${fileNameType}`;
			const filePath = `${configExpress.static.root}/${configNewlyJson.directory}/${fileName}${configExpress.extension.json}`;
			const brotliFilePath = `${filePath}${configExpress.extension.brotli}`;

			await Promise.all([fs.promises.writeFile(filePath, newlyJson), fs.promises.writeFile(brotliFilePath, newlyJsonBrotli)]);
			createdFilesPath.push(filePath);
			createdFilesPath.push(brotliFilePath);
		}),
	);

	return {
		files: createdFilesPath,
	};
};

export default create;
