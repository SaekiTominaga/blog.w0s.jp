import fs from 'node:fs';
import BlogNewlyJsonDao from '../dao/BlogNewlyJsonDao.js';
import MarkdownTitle from '../markdown/Title.js';
import Compress from '../util/Compress.js';
import type { JSON as Configure } from '../../../configure/type/newly-json.js';

interface ConfigCommon {
	dbFilePath: string;
	root: string;
	extentions: {
		json: string;
		brotli: string;
	};
}

/**
 * 新着 JSON ファイル生成
 */
export default class CreateNewlyJson {
	readonly #configCommon: ConfigCommon; // 共通設定の抜き出し

	readonly #config: Configure; // 機能設定

	/**
	 * @param configCommon 共通設定ファイル
	 * @param configCommon.dbFilePath DB ファイルパス
	 * @param configCommon.root ルートディレクトリ
	 * @param configCommon.extentions ファイル拡張子
	 *
	 * @returns ファイル生成情報
	 */
	constructor(configCommon: ConfigCommon) {
		this.#configCommon = configCommon;

		this.#config = JSON.parse(fs.readFileSync('configure/newly-json.json', 'utf8'));
	}

	/**
	 * @returns ファイル生成情報
	 */
	async execute(): Promise<{
		createdFilesPath: string[]; // 生成したファイルパス
	}> {
		const dao = new BlogNewlyJsonDao(this.#configCommon.dbFilePath);

		const datasCatgroup = new Map<string, BlogView.NewlyEntry[]>();

		datasCatgroup.set('', await dao.getEntries(this.#config.limit));

		await Promise.all(
			(await dao.getCategoryGroupMasterFileName()).map(async (fileName) => {
				datasCatgroup.set(fileName, await dao.getEntries(this.#config.limit, fileName));
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

				const newlyJsonBrotli = Compress.brotliText(newlyJson);

				/* ファイル出力 */
				const fileName =
					fileNameType === '' ? this.#config.filename_prefix : `${this.#config.filename_prefix}${this.#config.filename_separator}${fileNameType}`;
				const filePath = `${this.#configCommon.root}/${this.#config.directory}/${fileName}${this.#configCommon.extentions.json}`;
				const brotliFilePath = `${filePath}${this.#configCommon.extentions.brotli}`;

				await Promise.all([fs.promises.writeFile(filePath, newlyJson), fs.promises.writeFile(brotliFilePath, newlyJsonBrotli)]);
				createdFilesPath.push(filePath);
				createdFilesPath.push(brotliFilePath);
			}),
		);

		return {
			createdFilesPath: createdFilesPath,
		};
	}
}
