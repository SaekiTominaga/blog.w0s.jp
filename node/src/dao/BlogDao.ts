import * as sqlite from 'sqlite';
import sqlite3 from 'sqlite3';

interface NewlyTopicData {
	id: string;
	title: string;
}

interface TopicCountOfCategory {
	group_name: string;
	name: string;
	count: number;
}

/**
 * 日記共通
 */
export default class BlogDao {
	#dbh: sqlite.Database<sqlite3.Database, sqlite3.Statement> | null = null;

	/**
	 * @param {sqlite.Database} dbh - DB 接続情報
	 */
	constructor(dbh?: sqlite.Database<sqlite3.Database, sqlite3.Statement>) {
		if (dbh !== undefined) {
			this.#dbh = dbh;
		}
	}

	/**
	 * DB 接続情報を取得する
	 *
	 * @returns {sqlite.Database} DB 接続情報
	 */
	async getDbh(): Promise<sqlite.Database<sqlite3.Database, sqlite3.Statement>> {
		if (this.#dbh !== null) {
			return this.#dbh;
		}

		const dbh = await sqlite.open({
			filename: '../db/diary.db',
			driver: sqlite3.Database,
		});

		this.#dbh = dbh;

		return dbh;
	}

	/**
	 * 記事件数（非表示記事を除く）を取得
	 *
	 * @returns {number} 記事件数
	 */
	async getTopicCount(): Promise<number> {
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
		const row = await sth.get();
		await sth.finalize();

		if (row === undefined) {
			return 0;
		}

		return row.count;
	}

	/**
	 * 最終更新日時を取得する
	 *
	 * @returns {Array} 最終更新日時
	 */
	async getLastModified(): Promise<Date> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				modified
			FROM
				d_info
		`);
		const row = await sth.get();
		await sth.finalize();

		if (row === undefined) {
			throw new Error('No data is registered in the `d_info` table.');
		}

		return new Date(Number(row.modified * 1000));
	}

	/**
	 * サイドバー: 新着記事を取得
	 *
	 * @param {number} limit - 最大取得件数
	 *
	 * @returns {Array} 新着記事
	 */
	async getNewlyTopicData(limit: number): Promise<NewlyTopicData[]> {
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
		const rows = await sth.all();
		await sth.finalize();

		const newlyTopicList: NewlyTopicData[] = [];
		for (const row of rows) {
			newlyTopicList.push({
				id: row.id,
				title: row.title,
			});
		}

		return newlyTopicList;
	}

	/**
	 * サイドバー: カテゴリー毎の記事件数を取得
	 *
	 * @returns {Array} カテゴリー毎の記事件数
	 */
	async getTopicCountOfCategory(): Promise<TopicCountOfCategory[]> {
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
		const rows = await sth.all();
		await sth.finalize();

		const topicCountOfCategory: TopicCountOfCategory[] = [];
		for (const row of rows) {
			topicCountOfCategory.push({
				group_name: row.group_name,
				name: row.name,
				count: row.count,
			});
		}

		return topicCountOfCategory;
	}
}
