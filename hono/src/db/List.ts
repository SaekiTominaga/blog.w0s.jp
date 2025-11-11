import type { Selectable } from 'kysely';
import { jsToSQLite, sqliteToJS } from '@w0s/sqlite-utility';
import type { DEntry } from '../../../@types/db.d.ts';
import Database from './Database.ts';

/**
 * タイトル一覧
 */
export default class extends Database {
	/**
	 * 記事データを取得する
	 *
	 * @param page - ページ番号
	 * @param limit - 1ページあたりの最大表示件数
	 *
	 * @returns 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(
		page: number,
		limit: number,
	): Promise<Pick<Selectable<DEntry>, 'id' | 'title' | 'image_internal' | 'image_external' | 'registed_at' | 'updated_at'>[]> {
		let query = this.db.selectFrom('d_entry').select(['id', 'title', 'image_internal', 'image_external', 'registed_at', 'updated_at']);

		query = query.where('public', '=', jsToSQLite(true));
		query = query.orderBy('registed_at', 'desc');
		query = query.limit(limit);
		query = query.offset((page - 1) * limit);

		const rows = await query.execute();

		return rows.map((row) => ({
			id: sqliteToJS(row.id),
			title: sqliteToJS(row.title),
			image_internal: sqliteToJS(row.image_internal),
			image_external: sqliteToJS(row.image_external, 'url'),
			registed_at: sqliteToJS(row.registed_at, 'date'),
			updated_at: sqliteToJS(row.updated_at, 'date'),
		}));
	}
}
