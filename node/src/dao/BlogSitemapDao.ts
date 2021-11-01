import BlogDao from './BlogDao.js';

interface EntryData {
	id: number;
	last_modified: Date;
}

/**
 * サイトマップ生成
 */
export default class BlogSitemapDao extends BlogDao {
	/**
	 * 記事データを取得する
	 *
	 * @param {number} limit - 最大表示件数
	 *
	 * @returns {Array} 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(limit: number): Promise<EntryData[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id,
				CASE
					WHEN last_update IS NULL THEN insert_date
					ELSE last_update
				END AS last_modified
			FROM
				d_topic
			WHERE
				public = :public
			ORDER BY
				id DESC
			LIMIT :limit
		`);
		await sth.bind({
			':public': true,
			':limit': limit,
		});
		const rows = await sth.all();
		await sth.finalize();

		const entries: EntryData[] = [];
		for (const row of rows) {
			entries.push({
				id: Number(row.id),
				last_modified: new Date(Number(row.last_modified) * 1000),
			});
		}

		return entries;
	}
}
