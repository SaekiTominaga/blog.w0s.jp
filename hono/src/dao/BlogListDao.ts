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
export default class BlogListDao extends BlogDao {
	/**
	 * 記事データを取得する
	 *
	 * @param page - ページ番号
	 * @param limit - 1ページあたりの最大表示件数
	 *
	 * @returns 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(page: number, limit: number): Promise<Entry[]> {
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
				id,
				title,
				image_internal,
				image_external,
				registed_at,
				updated_at
			FROM
				d_entry
			WHERE
				public = :public
			ORDER BY
				registed_at DESC
			LIMIT :limit
			OFFSET :offset
		`);
		await sth.bind({
			':public': true,
			':limit': limit,
			':offset': (page - 1) * limit,
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
