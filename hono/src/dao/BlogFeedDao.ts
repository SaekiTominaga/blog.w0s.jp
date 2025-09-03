import { sqliteToJS } from '../util/sql.ts';
import BlogDao from './BlogDao.ts';

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
		const rows = await sth.all<Select[]>();
		await sth.finalize();

		return rows.map(
			(row): BlogDb.Entry => ({
				id: sqliteToJS(row.id),
				title: sqliteToJS(row.title),
				description: sqliteToJS(row.description),
				message: sqliteToJS(row.message),
				imageInternal: sqliteToJS(row.image_internal),
				imageExternal: sqliteToJS(row.image_external, 'url'),
				registedAt: sqliteToJS(row.registed_at, 'date'),
				updatedAt: sqliteToJS(row.updated_at, 'date'),
				public: sqliteToJS(row.public, 'boolean'),
			}),
		);
	}
}
