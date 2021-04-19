import BlogDao from './BlogDao.js';
import { BlogDto } from '../@types/blog.js';

/**
 * 日記タイトル一覧
 */
export default class BlogListDao extends BlogDao {
	/**
	 * 記事データを取得する
	 *
	 * @param {number} page - ページ番号
	 * @param {number} limit - 1ページあたりの最大表示件数
	 *
	 * @returns {Array} 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getTopics(page: number, limit: number): Promise<BlogDto.TopicData[]> {
		const dbh = await this._getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id,
				title,
				image AS image_internal,
				image_external,
				insert_date,
				last_update
			FROM
				d_topic
			WHERE
				public = :public
			ORDER BY
				insert_date DESC
			LIMIT :limit
			OFFSET :offset
		`);
		await sth.bind({
			':public': true,
			':limit': limit,
			':offset': (page - 1) * limit,
		});
		const rows = await sth.all();
		await sth.finalize();

		const topicDataList: BlogDto.TopicData[] = [];
		for (const row of rows) {
			topicDataList.push({
				id: Number(row.id),
				title: row.title,
				image_internal: row.image_internal,
				image_external: row.image_external,
				insert_date: new Date(Number(row.insert_date) * 1000),
				last_update: row.last_update !== null ? new Date(Number(row.last_update) * 1000) : null,
			});
		}

		return topicDataList;
	}
}
