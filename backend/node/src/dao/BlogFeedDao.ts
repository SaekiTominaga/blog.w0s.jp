import DbUtil from '../util/DbUtil.js';
import BlogDao from './BlogDao.js';

/**
 * フィード
 */
export default class BlogPostDao extends BlogDao {
	/**
	 * フィード用の記事データを取得する
	 *
	 * @param limit - 最大取得件数
	 *
	 * @returns 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(limit: number): Promise<BlogDb.Entry[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id,
				title,
				description,
				message,
				image AS image_internal,
				image_external,
				insert_date AS created_at,
				last_update AS updated_at,
				public
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

		const entries: BlogDb.Entry[] = [];
		for (const row of rows) {
			entries.push({
				id: row.id,
				title: row.title,
				description: row.description,
				message: row.message,
				image_internal: row.image_internal,
				image_external: row.image_external,
				created_at: DbUtil.unixToDate(row.created_at)!,
				updated_at: DbUtil.unixToDate(row.updated_at),
				public: Boolean(row.public),
			});
		}

		return entries;
	}
}
