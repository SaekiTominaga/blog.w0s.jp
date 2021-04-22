import BlogDao from './BlogDao.js';

interface TopicData {
	id: number;
	title: string;
	message: string;
	date: Date;
	last_update?: Date | null;
}

/**
 * 日記タイトル一覧
 */
export default class BlogListDao extends BlogDao {
	/**
	 * 記事データを取得する
	 *
	 * @param {number} limit - 最大表示件数
	 *
	 * @returns {Array} 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getTopics(limit: number): Promise<TopicData[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id,
				title,
				message,
				CASE
					WHEN last_update IS NULL THEN insert_date
					ELSE last_update
				END AS date,
				last_update
			FROM
				d_topic
			WHERE
				public = :public
			ORDER BY
				CASE
					WHEN last_update IS NULL THEN insert_date
					ELSE last_update
				END DESC
			LIMIT :limit
		`);
		await sth.bind({
			':public': true,
			':limit': limit,
		});
		const rows = await sth.all();
		await sth.finalize();

		const topicDataList: TopicData[] = [];
		for (const row of rows) {
			topicDataList.push({
				id: Number(row.id),
				title: row.title,
				message: row.message,
				date: new Date(Number(row.date) * 1000),
				last_update: row.last_update !== null ? new Date(Number(row.last_update) * 1000) : null,
			});
		}

		return topicDataList;
	}
}
