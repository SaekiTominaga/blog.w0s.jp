import { sql, type Selectable } from 'kysely';
import { jsToSQLite, sqliteToJS } from '@w0s/sqlite-utility';
import type { DEntry } from '../../../@types/db.d.ts';
import Database from './Database.ts';

/**
 * フィード
 */
export default class extends Database {
	/**
	 * フィード用の記事データを取得する
	 *
	 * @param limit - 最大取得件数
	 *
	 * @returns 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(limit: number): Promise<Pick<Selectable<DEntry>, 'id' | 'title' | 'description' | 'message' | 'registed_at' | 'updated_at'>[]> {
		let query = this.db.selectFrom('d_entry').select(['id', 'title', 'description', 'message', 'registed_at', 'updated_at']);
		query = query.where('public', '=', jsToSQLite(true));
		query = query.orderBy(
			sql`
				CASE
					WHEN updated_at IS NULL THEN registed_at
					ELSE updated_at
				END`,
			'desc',
		);
		query = query.limit(limit);

		const rows = await query.execute();

		return rows.map((row) => ({
			id: sqliteToJS(row.id),
			title: sqliteToJS(row.title),
			description: sqliteToJS(row.description),
			message: sqliteToJS(row.message),
			registed_at: sqliteToJS(row.registed_at, 'date'),
			updated_at: sqliteToJS(row.updated_at, 'date'),
		}));
	}
}
