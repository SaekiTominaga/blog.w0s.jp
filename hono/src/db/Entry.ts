import type { Selectable } from 'kysely';
import { jsToSQLiteComparison, sqliteToJS } from '@w0s/sqlite-utility';
import type { DEntry } from '../../../@types/db_blog.d.ts';
import Database from './Database.ts';

/**
 * 記事
 */
export default class extends Database {
	/**
	 * 記事データを取得する
	 *
	 * @param id - 記事 ID
	 *
	 * @returns 記事データ
	 */
	async findEntry(id: number): Promise<Omit<Selectable<DEntry>, 'public'> | undefined> {
		let query = this.db
			.selectFrom('d_entry')
			.select(['id', 'title', 'description', 'message', 'image_internal', 'image_external', 'registed_at', 'updated_at']);

		query = query.where('id', '=', jsToSQLiteComparison(id));
		query = query.where('public', '=', jsToSQLiteComparison(true));

		const row = await query.executeTakeFirst();

		if (row === undefined) {
			return undefined;
		}

		return {
			id: sqliteToJS(row.id),
			title: sqliteToJS(row.title),
			description: sqliteToJS(row.description),
			message: sqliteToJS(row.message),
			image_internal: sqliteToJS(row.image_internal),
			image_external: sqliteToJS(row.image_external, 'url'),
			registed_at: sqliteToJS(row.registed_at, 'date'),
			updated_at: sqliteToJS(row.updated_at, 'date'),
		};
	}

	/**
	 * 記事のカテゴリー情報を取得
	 *
	 * @param entryId - 記事 ID
	 *
	 * @returns カテゴリー情報
	 */
	async getCategories(entryId: number): Promise<
		{
			id: string;
			name: string;
			file_name: string | undefined;
		}[]
	> {
		let query = this.db
			.selectFrom(['d_entry_category as ec', 'm_category as c', 'm_catgroup as cg'])
			.select(['c.id as id', 'c.name as name', 'cg.file_name as file_name']);

		query = query.where('ec.entry_id', '=', jsToSQLiteComparison(entryId));
		query = query.whereRef('ec.category_id', '=', 'c.id');
		query = query.whereRef('c.catgroup', '=', 'cg.id');
		query = query.orderBy('cg.sort');
		query = query.orderBy('c.sort');

		const rows = await query.execute();

		return rows.map((row) => ({
			id: sqliteToJS(row.id),
			name: sqliteToJS(row.name),
			file_name: sqliteToJS(row.file_name),
		}));
	}

	/**
	 * 関連記事を取得
	 *
	 * @param entryId - 記事 ID
	 *
	 * @returns 関連記事データ
	 */
	async getRelations(entryId: number): Promise<
		{
			id: number;
			title: string;
			image_internal: string | undefined;
			image_external: URL | undefined;
			registed_at: Date;
		}[]
	> {
		let query = this.db
			.selectFrom(['d_entry as e', 'd_entry_relation as er'])
			.select(['e.id as id', 'e.title as title', 'e.image_internal as image_internal', 'e.image_external as image_external', 'e.registed_at as registed_at']);

		query = query.where('er.entry_id', '=', jsToSQLiteComparison(entryId));
		query = query.whereRef('er.relation_id', '=', 'e.id');
		query = query.where('e.public', '=', jsToSQLiteComparison(true));
		query = query.orderBy('e.registed_at', 'desc');

		const rows = await query.execute();

		return rows.map((row) => ({
			id: sqliteToJS(row.id),
			title: sqliteToJS(row.title),
			image_internal: sqliteToJS(row.image_internal),
			image_external: sqliteToJS(row.image_external, 'url'),
			registed_at: sqliteToJS(row.registed_at, 'date'),
		}));
	}
}
