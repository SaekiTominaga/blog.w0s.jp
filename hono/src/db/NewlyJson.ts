import type { Selectable } from 'kysely';
import { jsToSQLiteComparison, sqliteToJS } from '@w0s/sqlite-utility';
import type { DEntry } from '../../../@types/db.d.ts';
import Database from './Database.ts';

/**
 * 新着 JSON ファイル
 */
export default class extends Database {
	/**
	 * カテゴリーグループに紐付けられたファイル名リストを取得
	 *
	 * @returns ファイル名
	 */
	async getCategoryGroupMasterFileName(): Promise<string[]> {
		let query = this.db.selectFrom('m_catgroup').select(['file_name']);
		query = query.where('file_name', 'is not', null);

		const rows = await query.execute();

		return rows.map((row): string => sqliteToJS(row.file_name!));
	}

	/**
	 * 新着記事データを取得する
	 *
	 * @param limit - 最大取得件数
	 * @param catgroupId - カテゴリグループの ID
	 *
	 * @returns 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(limit: number, catgroupId?: string): Promise<Pick<Selectable<DEntry>, 'id' | 'title'>[]> {
		if (catgroupId === undefined) {
			let query = this.db.selectFrom('d_entry').select(['id', 'title']);
			query = query.where('public', '=', jsToSQLiteComparison(true));
			query = query.orderBy('id', 'desc');

			query = query.limit(limit);

			const rows = await query.execute();

			return rows.map((row) => ({
				id: sqliteToJS(row.id),
				title: sqliteToJS(row.title),
			}));
		}

		let query = this.db
			.selectFrom(['d_entry as e', 'd_entry_category as ec', 'm_category as c', 'm_catgroup as cg'])
			.select(['e.id as id', 'e.title as title']);
		query = query.where('e.public', '=', jsToSQLiteComparison(true));
		query = query.whereRef('e.id', '=', 'ec.entry_id');
		query = query.whereRef('ec.category_id', '=', 'c.id');
		query = query.whereRef('c.catgroup', '=', 'cg.id');
		query = query.where('cg.file_name', '=', jsToSQLiteComparison(catgroupId));
		query = query.groupBy('e.id');
		query = query.orderBy('e.id', 'desc');

		query = query.limit(limit);

		const rows = await query.execute();

		return rows.map((row) => ({
			id: sqliteToJS(row.id),
			title: sqliteToJS(row.title),
		}));
	}
}
