import MarkdownTitle from '../../../remark/dist/Title.js';
import Dao from '../db/Database.ts';
import type { NewlyEntry } from '../../@types/view.d.ts';

interface EntryCountOfCategory {
	categoryName: string;
	count: number;
}

/**
 * サイドバー
 */
export default class Sidebar {
	readonly #dao: Dao;

	/**
	 * @param dao - 日記共通 Dao
	 */
	constructor(dao: Dao) {
		this.#dao = dao;
	}

	/**
	 * カテゴリ毎の記事件数を取得する
	 *
	 * @returns カテゴリ毎の記事件数
	 */
	async getEntryCountOfCategory(): Promise<Map<string, readonly EntryCountOfCategory[]>> {
		const dto = await this.#dao.getEntryCountOfCategory();

		const entryCountOfCategoryList = dto.reduce((map, entryCountOfCategory) => {
			const countDataList = map.get(entryCountOfCategory.group_name) ?? [];
			countDataList.push({
				categoryName: entryCountOfCategory.name,
				count: entryCountOfCategory.count,
			});
			map.set(entryCountOfCategory.group_name, countDataList);
			return map;
		}, new Map<string, EntryCountOfCategory[]>());

		return entryCountOfCategoryList;
	}

	/**
	 * 新着記事情報を取得する
	 *
	 * @param limit - 最大取得件数
	 *
	 * @returns 新着記事
	 */
	async getNewlyEntries(limit: number): Promise<readonly NewlyEntry[]> {
		const entriesDto = await this.#dao.getNewlyEntries(limit);

		const entries = entriesDto.map(
			(entryDto): NewlyEntry => ({
				id: entryDto.id,
				title: new MarkdownTitle(entryDto.title).mark(),
			}),
		);

		return entries;
	}
}
