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
		interface Select {
			id: number;
			title: string;
			description: string | null;
			message: string;
			image_internal: string | null;
			image_external: string | null;
			registed_at: number;
			updated_at: number | null;
			public: number;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id,
				title,
				description,
				message,
				image_internal,
				image_external,
				registed_at,
				updated_at,
				public
			FROM
				d_entry
			WHERE
				public = :public
			ORDER BY
				CASE
					WHEN updated_at IS NULL THEN registed_at
					ELSE updated_at
				END DESC
			LIMIT :limit
		`);
		await sth.bind({
			':public': true,
			':limit': limit,
		});
		const rows: Select[] = await sth.all();
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
				registed_at: DbUtil.unixToDate(row.registed_at)!,
				updated_at: DbUtil.unixToDate(row.updated_at),
				public: Boolean(row.public),
			});
		}

		return entries;
	}
}
