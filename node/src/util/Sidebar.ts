import BlogDao from '../dao/BlogDao.js';

interface NewlyTopicData {
	id: string;
	title: string;
}

interface TopicCountOfCategory {
	category_name: string;
	count: number;
}

/**
 * サイドバー
 */
export default class Sidebar {
	#dao: BlogDao;

	constructor(dao: BlogDao) {
		this.#dao = dao;
	}

	/**
	 * カテゴリ毎の記事件数を取得する
	 *
	 * @returns {Map} カテゴリ毎の記事件数
	 */
	async getTopicCountOfCategory(): Promise<Map<string, TopicCountOfCategory[]>> {
		const dto = await this.#dao.getTopicCountOfCategory();

		const topicCountOfCategoryList = new Map<string, TopicCountOfCategory[]>();
		for (const topicCountOfCategory of dto) {
			const countDataList = topicCountOfCategoryList.get(topicCountOfCategory.group_name) ?? [];
			countDataList.push({
				category_name: topicCountOfCategory.name,
				count: topicCountOfCategory.count,
			});
			topicCountOfCategoryList.set(topicCountOfCategory.group_name, countDataList);
		}

		return topicCountOfCategoryList;
	}

	/**
	 * 新着記事情報を取得する
	 *
	 * @param {number} limit - 最大取得件数
	 *
	 * @returns {Array} 新着記事
	 */
	async getNewlyTopicData(limit: number): Promise<NewlyTopicData[]> {
		return await this.#dao.getNewlyTopicData(limit);
	}
}
