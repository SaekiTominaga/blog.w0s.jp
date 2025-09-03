import BlogDao from '../dao/BlogDao.ts';
import MarkdownTitle from '../markdown/Title.ts';

interface NewlyEntry {
	id: number;
	title: string;
}

interface EntryCountOfCategory {
	categoryName: string;
	count: number;
}

/**
 * サイドバー
 */
export default class Sidebar {
	#dao: BlogDao;

	/**
	 * @param dao - 日記共通 Dao
	 */
	constructor(dao: BlogDao) {
		this.#dao = dao;
	}

	/**
	 * カテゴリ毎の記事件数を取得する
	 *
	 * @returns カテゴリ毎の記事件数
	 */
	async getEntryCountOfCategory(): Promise<Map<string, EntryCountOfCategory[]>> {
		const dto = await this.#dao.getEntryCountOfCategory();

		const entryCountOfCategoryList = new Map<string, EntryCountOfCategory[]>();
		for (const entryCountOfCategory of dto) {
			const countDataList = entryCountOfCategoryList.get(entryCountOfCategory.groupName) ?? [];
			countDataList.push({
				categoryName: entryCountOfCategory.name,
				count: entryCountOfCategory.count,
			});
			entryCountOfCategoryList.set(entryCountOfCategory.groupName, countDataList);
		}

		return entryCountOfCategoryList;
	}

	/**
	 * 新着記事情報を取得する
	 *
	 * @param limit - 最大取得件数
	 *
	 * @returns 新着記事
	 */
	async getNewlyEntries(limit: number): Promise<NewlyEntry[]> {
		const entriesDto = await this.#dao.getNewlyEntries(limit);

		const entries: BlogView.NewlyEntry[] = [];
		for (const entryDto of entriesDto) {
			entries.push({
				id: entryDto.id,
				title: new MarkdownTitle(entryDto.title).mark(),
			});
		}

		return entries;
	}
}
