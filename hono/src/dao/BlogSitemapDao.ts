import DbUtil from '../util/DbUtil.js';
import BlogDao from './BlogDao.js';

/**
 * サイトマップ
 */
export default class BlogSitemapDao extends BlogDao {
	/**
	 * 新着記事データを取得する
	 *
	 * @param limit - 最大取得件数
	 *
	 * @returns 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(limit: number): Promise<BlogView.SitemapEntry[]> {
		interface Select {
			id: number;
			created_at: number;
			updated_at: number | null;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id,
				insert_date AS created_at,
				last_update AS updated_at
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

		const rows: Select[] = await sth.all();
		await sth.finalize();

		const entries: BlogView.SitemapEntry[] = [];
		for (const row of rows) {
			entries.push({
				id: row.id,
				updated_at: DbUtil.unixToDayjs(row.updated_at ?? row.created_at)!,
			});
		}

		return entries;
	}
}
