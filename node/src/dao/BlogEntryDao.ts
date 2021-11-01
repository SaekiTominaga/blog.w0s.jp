import BlogDao from './BlogDao.js';

export interface Category {
	id: string;
	name: string;
	sidebar_amazon: string | null;
	book: string | null;
}

export interface Relation {
	id: number;
	title: string;
	image_internal: string | null;
	image_external: string | null;
	insert_date: Date;
}

/**
 * 日記記事
 */
export default class BlogEntryDao extends BlogDao {
	/**
	 * 記事データを取得する
	 *
	 * @param {number} entryId - 記事 ID
	 *
	 * @returns {object} 記事データ
	 */
	async getEntry(entryId: number): Promise<BlogDb.Entry | null> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				t.title AS title,
				t.description AS description,
				t.message AS message,
				t.image AS image_internal,
				t.image_external AS image_external,
				t.insert_date AS insert_date,
				t.last_update AS last_update
			FROM
				d_topic t
			WHERE
				t.id = :id AND
				t.public = :public
		`);
		await sth.bind({
			':id': entryId,
			':public': true,
		});
		const row = await sth.get();
		await sth.finalize();

		if (row === undefined) {
			return null;
		}

		return {
			id: entryId,
			title: row.title,
			description: row.description,
			message: row.message,
			image_internal: row.image_internal,
			image_external: row.image_external,
			insert_date: new Date(Number(row.insert_date) * 1000),
			last_update: row.last_update !== null ? new Date(Number(row.last_update) * 1000) : null,
			public: true,
		};
	}

	/**
	 * 記事のカテゴリー情報を取得
	 *
	 * @param {number} entryId - 記事 ID
	 *
	 * @returns {Array} カテゴリー情報
	 */
	async getCategories(entryId: number): Promise<Category[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				c.id AS id,
				c.name AS name,
				c.sidebar_amazon AS sidebar_amazon,
				c.book AS book
			FROM
				d_topic_category tc,
				m_category c,
				m_catgroup cg
			WHERE
				tc.topic_id = :id AND
				tc.category_id = c.id AND
				c.catgroup = cg.id
			ORDER BY
				cg.sort,
				c.sort
		`);
		await sth.bind({
			':id': entryId,
		});
		const rows = await sth.all();
		await sth.finalize();

		const categories: Category[] = [];
		for (const row of rows) {
			categories.push({
				id: row.id,
				name: row.name,
				sidebar_amazon: row.sidebar_amazon,
				book: row.book,
			});
		}

		return categories;
	}

	/**
	 * 関連記事を取得
	 *
	 * @param {number} entryId - 記事 ID
	 *
	 * @returns {Array} 関連記事データ
	 */
	async getRelations(entryId: number): Promise<Relation[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				t.id AS id,
				t.title AS title,
				t.image AS image_internal,
				t.image_external AS image_external,
				t.insert_date AS insert_date
			FROM
				d_topic t,
				d_topic_relation tr
			WHERE
				tr.topic_id = :id AND
				tr.relation_id = t.id AND
				t.public = :public
			ORDER BY
				t.insert_date DESC
		`);
		await sth.bind({
			':id': entryId,
			':public': true,
		});
		const rows = await sth.all();
		await sth.finalize();

		const relations: Relation[] = [];
		for (const row of rows) {
			relations.push({
				id: row.id,
				title: row.title,
				image_internal: row.image_internal,
				image_external: row.image_external,
				insert_date: new Date(Number(row.insert_date) * 1000),
			});
		}

		return relations;
	}
}
