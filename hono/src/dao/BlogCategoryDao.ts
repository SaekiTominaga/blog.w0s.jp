import { sqliteToJS } from '../util/sql.js';
import BlogDao from './BlogDao.js';

interface Entry {
	id: number;
	title: string;
	imageInternal: string | undefined;
	imageExternal: string | undefined;
	registedAt: Date;
	updatedAt?: Date | undefined;
}

/**
 * 日記タイトル一覧
 */
export default class BlogCategoryDao extends BlogDao {
	/**
	 * 記事データを取得する
	 *
	 * @param categoryName - カテゴリ名
	 *
	 * @returns 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(categoryName: string): Promise<Entry[]> {
		interface Select {
			id: number;
			title: string;
			image_internal: string | null;
			image_external: string | null;
			registed_at: number;
			updated_at: number | null;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
				SELECT
					e.id AS id,
					e.title AS title,
					e.image_internal AS image_internal,
					e.image_external AS image_external,
					e.registed_at,
					e.updated_at AS updated_at
				FROM
					m_category c,
					d_entry_category ec,
					d_entry e
				WHERE
					c.name = :name AND
					c.id = ec.category_id AND
					ec.entry_id = e.id AND
					e.public = :public
				ORDER BY
					e.registed_at DESC
		`);
		await sth.bind({
			':name': categoryName,
			':public': true,
		});
		const rows = await sth.all<Select[]>();
		await sth.finalize();

		return rows.map(
			(row): Entry => ({
				id: sqliteToJS(row.id),
				title: sqliteToJS(row.title),
				imageInternal: sqliteToJS(row.image_internal),
				imageExternal: sqliteToJS(row.image_external),
				registedAt: sqliteToJS(row.registed_at, 'date'),
				updatedAt: sqliteToJS(row.updated_at, 'date'),
			}),
		);
	}
}
