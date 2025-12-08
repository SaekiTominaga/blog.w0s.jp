import type { Selectable } from 'kysely';
import { jsToSQLiteComparison, sqliteToJS } from '@w0s/sqlite-utility';
import type { DEntry } from '../../../@types/db.ts';
import Database from './Database.ts';

/**
 * サイトマップ
 */
export default class extends Database {
	/**
	 * 新着記事データを取得する
	 *
	 * @param limit - 最大取得件数
	 *
	 * @returns 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(limit: number): Promise<Pick<Selectable<DEntry>, 'id' | 'registed_at' | 'updated_at'>[]> {
		let query = this.db.selectFrom('d_entry').select(['id', 'registed_at', 'updated_at']);
		query = query.where('public', '=', jsToSQLiteComparison(true));
		query = query.orderBy('id', 'desc');
		query = query.limit(limit);

		const rows = await query.execute();

		return rows.map((row) => ({
			id: sqliteToJS(row.id),
			registed_at: sqliteToJS(row.registed_at, 'date'),
			updated_at: sqliteToJS(row.updated_at, 'date'),
		}));
	}
}
