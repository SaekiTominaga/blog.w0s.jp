import DbUtil from '../util/DbUtil.js';
import BlogDao from './BlogDao.js';

export interface Category {
	id: string;
	name: string;
	file_name: string | null;
}

export interface Relation {
	id: number;
	title: string;
	image_internal: string | null;
	image_external: string | null;
	created: Date;
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
				title,
				description,
				message,
				image AS image_internal,
				image_external,
				insert_date AS created_at,
				last_update AS updated_at
			FROM
				d_topic
			WHERE
				id = :id AND
				public = :public
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
			created_at: <Date>DbUtil.unixToDate(row.created_at),
			updated_at: DbUtil.unixToDate(row.updated_at),
			public: true,
		};
	}

	/**
	 * 記事のカテゴリー情報を取得
	 *
	 * @param {number} entryId - 記事 ID
	 *
	 * @returns {object[]} カテゴリー情報
	 */
	async getCategories(entryId: number): Promise<Category[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				c.id AS id,
				c.name AS name,
				cg.file_name AS file_name
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
				file_name: row.file_name,
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
				t.insert_date AS created
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
				created: <Date>DbUtil.unixToDate(row.created),
			});
		}

		return relations;
	}
}
