import SQLite from 'better-sqlite3';
import { Kysely, sql, SqliteDialect } from 'kysely';
import { jsToSQLiteComparison, sqliteToJS } from '@w0s/sqlite-utility';
import type { DB } from '../../../@types/db.ts';

/**
 * 日記データーベース
 */
export default class {
	protected readonly db: Kysely<DB>;

	/**
	 * @param filePath - DB ファイルパス
	 * @param options - オプション
	 */
	constructor(filePath: string, options?: Readonly<Pick<SQLite.Options, 'readonly'>>) {
		const sqlite = new SQLite(filePath, {
			/* https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#new-databasepath-options */
			readonly: options?.readonly ?? false,
			fileMustExist: true,
		});
		sqlite.pragma('journal_mode = WAL');

		this.db = new Kysely<DB>({
			dialect: new SqliteDialect({
				database: sqlite,
			}),
		});
	}

	/**
	 * 最終更新日時を取得する
	 *
	 * @returns 最終更新日時
	 */
	async getLastModified(): Promise<Date> {
		let query = this.db.selectFrom('d_info').selectAll();

		query = query.orderBy('modified', 'desc');

		const row = await query.executeTakeFirstOrThrow();

		return sqliteToJS(row.modified, 'date');
	}

	/**
	 * 記事件数（非表示記事を除く）を取得
	 *
	 * @returns 記事件数
	 */
	async getEntryCount(): Promise<number> {
		let query = this.db.selectFrom('d_entry').select([sql<number>`COUNT()`.as('count')]);

		query = query.where('public', '=', jsToSQLiteComparison(true));

		const row = await query.executeTakeFirst();
		if (row === undefined) {
			return 0;
		}

		return row.count;
	}

	/**
	 * サイドバー: 新着記事を取得
	 *
	 * @param limit - 最大取得件数
	 *
	 * @returns 新着記事
	 */
	async getNewlyEntries(limit: number): Promise<
		{
			id: number;
			title: string;
		}[]
	> {
		let query = this.db.selectFrom('d_entry').select(['id', 'title']);

		query = query.where('public', '=', jsToSQLiteComparison(true));
		query = query.orderBy('registed_at', 'desc');
		query = query.limit(limit);

		const rows = await query.execute();

		return rows.map((row) => ({
			id: sqliteToJS(row.id),
			title: sqliteToJS(row.title),
		}));
	}

	/**
	 * サイドバー: カテゴリー毎の記事件数を取得
	 *
	 * @returns カテゴリー毎の記事件数
	 */
	async getEntryCountOfCategory(): Promise<
		{
			group_name: string;
			name: string;
			count: number;
		}[]
	> {
		let query = this.db
			.selectFrom(['m_category as c', 'm_catgroup as cg', 'd_entry_category as ec', 'd_entry as e'])
			.select(['cg.name as group_name', 'c.name as name', sql<number>`COUNT(ec.category_id)`.as('count')]);

		query = query.whereRef('c.catgroup', '=', 'cg.id');
		query = query.whereRef('c.id', '=', 'ec.category_id');
		query = query.whereRef('ec.entry_id', '=', 'e.id');
		query = query.where('e.public', '=', jsToSQLiteComparison(true));
		query = query.groupBy('c.id');
		query = query.orderBy('cg.sort');
		query = query.orderBy('c.sort');

		const rows = await query.execute();

		return rows.map((row) => ({
			group_name: sqliteToJS(row.group_name),
			name: sqliteToJS(row.name),
			count: sqliteToJS(row.count),
		}));
	}
}
