import * as sqlite from 'sqlite';
import sqlite3 from 'sqlite3';
import { sqliteToJS } from '../util/sql.js';

interface NewlyEntry {
	id: number;
	title: string;
}

interface EntryCountOfCategory {
	groupName: string;
	name: string;
	count: number;
}

/**
 * 日記共通
 */
export default class BlogDao {
	#dbh: sqlite.Database | null = null;

	readonly #filepath: string;

	/**
	 * @param filepath - DB ファイルパス
	 * @param dbh - DB 接続情報
	 */
	constructor(filepath: string, dbh?: sqlite.Database) {
		this.#filepath = filepath;

		if (dbh !== undefined) {
			this.#dbh = dbh;
		}
	}

	/**
	 * DB 接続情報を取得する
	 *
	 * @returns DB 接続情報
	 */
	async getDbh(): Promise<sqlite.Database> {
		if (this.#dbh !== null) {
			return this.#dbh;
		}

		const dbh = await sqlite.open({
			filename: this.#filepath,
			driver: sqlite3.Database,
		});

		this.#dbh = dbh;

		return dbh;
	}

	/**
	 * 記事件数（非表示記事を除く）を取得
	 *
	 * @returns 記事件数
	 */
	async getEntryCount(): Promise<number> {
		interface Select {
			count: number;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				COUNT(id) AS count
			FROM
				d_entry
			WHERE
				public = :public
		`);
		await sth.bind({
			':public': true,
		});
		const row = await sth.get<Select>();
		await sth.finalize();

		if (row === undefined) {
			return 0;
		}

		return row.count;
	}

	/**
	 * 最終更新日時を取得する
	 *
	 * @returns 最終更新日時
	 */
	async getLastModified(): Promise<Date> {
		interface Select {
			modified: number;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				modified
			FROM
				d_info
			ORDER BY
				modified DESC
			LIMIT 1
		`);
		const row = await sth.get<Select>();
		await sth.finalize();

		if (row === undefined) {
			throw new Error('No data is registered in the `d_info` table.');
		}

		return sqliteToJS(row.modified, 'date');
	}

	/**
	 * サイドバー: 新着記事を取得
	 *
	 * @param limit - 最大取得件数
	 *
	 * @returns 新着記事
	 */
	async getNewlyEntries(limit: number): Promise<NewlyEntry[]> {
		interface Select {
			id: number;
			title: string;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id,
				title
			FROM
				d_entry
			WHERE
				public = :public
			ORDER BY
				registed_at DESC
			LIMIT :limit
		`);
		await sth.bind({
			':public': true,
			':limit': limit,
		});
		const rows = await sth.all<Select[]>();
		await sth.finalize();

		return rows.map(
			(row): NewlyEntry => ({
				id: sqliteToJS(row.id),
				title: sqliteToJS(row.title),
			}),
		);
	}

	/**
	 * サイドバー: カテゴリー毎の記事件数を取得
	 *
	 * @returns カテゴリー毎の記事件数
	 */
	async getEntryCountOfCategory(): Promise<EntryCountOfCategory[]> {
		interface Select {
			group_name: string;
			name: string;
			count: number;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				cg.name AS group_name,
				c.name AS name,
				COUNT(ec.category_id) AS count
			FROM
				m_category c,
				m_catgroup cg,
				d_entry_category ec,
				d_entry e
			WHERE
				c.catgroup = cg.id AND
				c.id = ec.category_id AND
				ec.entry_id = e.id AND
				e.public = :public
			GROUP BY
				c.id
			ORDER BY
				cg.sort,
				c.sort
		`);
		await sth.bind({
			':public': true,
		});
		const rows = await sth.all<Select[]>();
		await sth.finalize();

		return rows.map(
			(row): EntryCountOfCategory => ({
				groupName: sqliteToJS(row.group_name),
				name: sqliteToJS(row.name),
				count: sqliteToJS(row.count),
			}),
		);
	}
}
