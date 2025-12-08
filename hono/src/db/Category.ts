import type { Selectable } from 'kysely';
import { jsToSQLiteComparison, sqliteToJS } from '@w0s/sqlite-utility';
import type { DEntry } from '../../../@types/db_blog.ts';
import Database from './Database.ts';

/**
 * カテゴリー一覧
 */
export default class extends Database {
	/**
	 * 記事データを取得する
	 *
	 * @param categoryName - カテゴリ名
	 *
	 * @returns 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(
		categoryName: string,
	): Promise<Pick<Selectable<DEntry>, 'id' | 'title' | 'image_internal' | 'image_external' | 'registed_at' | 'updated_at'>[]> {
		let query = this.db
			.selectFrom(['m_category as c', 'd_entry_category as ec', 'd_entry as e'])
			.select([
				'e.id as id',
				'e.title as title',
				'e.image_internal as image_internal',
				'e.image_external as image_external',
				'e.registed_at as registed_at',
				'e.updated_at as updated_at',
			]);
		query = query.where('c.name', '=', jsToSQLiteComparison(categoryName));
		query = query.whereRef('c.id', '=', 'ec.category_id');
		query = query.whereRef('ec.entry_id', '=', 'e.id');
		query = query.where('public', '=', jsToSQLiteComparison(true));
		query = query.orderBy('e.registed_at', 'desc');

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
