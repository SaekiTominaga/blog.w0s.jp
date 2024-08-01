import * as sqlite from 'sqlite';
import sqlite3 from 'sqlite3';

interface NewlyEntry {
	id: number;
	title: string;
}

interface EntryCountOfCategory {
	group_name: string;
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
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				COUNT(id) AS count
			FROM
				d_topic
			WHERE
				public = :public
		`);
		await sth.bind({
			':public': true,
		});
		const row: { count: number } | undefined = await sth.get();
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
		const row: Select | undefined = await sth.get();
		await sth.finalize();

		if (row === undefined) {
			throw new Error('No data is registered in the `d_info` table.');
		}

		return new Date(row.modified * 1000);
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
				d_topic
			WHERE
				public = :public
			ORDER BY
				insert_date DESC
			LIMIT :limit
		`);
		await sth.bind({
			':public': true,
			':limit': limit,
		});
		const rows: Select[] = await sth.all();
		await sth.finalize();

		const newlyEntries: NewlyEntry[] = [];
		for (const row of rows) {
			newlyEntries.push({
				id: row.id,
				title: row.title,
			});
		}

		return newlyEntries;
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
				COUNT(tc.category_id) AS count
			FROM
				m_category c,
				m_catgroup cg,
				d_topic_category tc,
				d_topic t
			WHERE
				c.catgroup = cg.id AND
				c.id = tc.category_id AND
				tc.topic_id = t.id AND
				t.public = :public
			GROUP BY
				c.id
			ORDER BY
				cg.sort,
				c.sort
		`);
		await sth.bind({
			':public': true,
		});
		const rows: Select[] = await sth.all();
		await sth.finalize();

		const entryCountOfCategory: EntryCountOfCategory[] = [];
		for (const row of rows) {
			entryCountOfCategory.push({
				group_name: row.group_name,
				name: row.name,
				count: row.count,
			});
		}

		return entryCountOfCategory;
	}
}
