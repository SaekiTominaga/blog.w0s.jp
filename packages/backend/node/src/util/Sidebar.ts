import BlogDao from '../dao/BlogDao.js';
import MessageParserInline from '../util/@message/Inline.js';

interface NewlyEntry {
	id: number;
	title: string;
}

interface EntryCountOfCategory {
	category_name: string;
	count: number;
}

/**
 * サイドバー
 */
export default class Sidebar {
	#messageParserInline: MessageParserInline;

	#dao: BlogDao;

	/**
	 * @param {BlogDao} dao - 日記共通 Dao
	 * @param {MessageParserInline} messageParserInline - 記事メッセージのインライン処理
	 */
	constructor(dao: BlogDao, messageParserInline: MessageParserInline) {
		this.#dao = dao;

		this.#messageParserInline = messageParserInline;
	}

	/**
	 * カテゴリ毎の記事件数を取得する
	 *
	 * @returns {Map} カテゴリ毎の記事件数
	 */
	async getEntryCountOfCategory(): Promise<Map<string, EntryCountOfCategory[]>> {
		const dto = await this.#dao.getEntryCountOfCategory();

		const entryCountOfCategoryList = new Map<string, EntryCountOfCategory[]>();
		for (const entryCountOfCategory of dto) {
			const countDataList = entryCountOfCategoryList.get(entryCountOfCategory.group_name) ?? [];
			countDataList.push({
				category_name: entryCountOfCategory.name,
				count: entryCountOfCategory.count,
			});
			entryCountOfCategoryList.set(entryCountOfCategory.group_name, countDataList);
		}

		return entryCountOfCategoryList;
	}

	/**
	 * 新着記事情報を取得する
	 *
	 * @param {number} limit - 最大取得件数
	 *
	 * @returns {Array} 新着記事
	 */
	async getNewlyEntries(limit: number): Promise<NewlyEntry[]> {
		const entriesDto = await this.#dao.getNewlyEntries(limit);

		const entries: BlogView.NewlyEntry[] = [];
		for (const entryDto of entriesDto) {
			entries.push({
				id: entryDto.id,
				title: this.#messageParserInline.mark(entryDto.title, { code: true }),
			});
		}

		return entries;
	}
}