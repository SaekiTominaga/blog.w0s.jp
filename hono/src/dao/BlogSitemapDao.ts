import { sqliteToJS } from '@w0s/sqlite-utility';
import BlogDao from './BlogDao.ts';

interface Entry {
	id: number;
	updatedAt: Date;
}

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
	async getEntries(limit: number): Promise<Entry[]> {
		interface Select {
			id: number;
			registed_at: number;
			updated_at: number | null;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id,
				registed_at,
				updated_at
			FROM
				d_entry
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

		const rows = await sth.all<Select[]>();
		await sth.finalize();

		return rows.map(
			(row): Entry => ({
				id: sqliteToJS(row.id),
				updatedAt: sqliteToJS(row.updated_at ?? row.registed_at, 'date'),
			}),
		);
	}
}
