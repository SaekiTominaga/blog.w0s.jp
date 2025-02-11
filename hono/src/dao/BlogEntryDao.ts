import DbUtil from '../util/DbUtil.js';
import BlogDao from './BlogDao.js';

interface Category {
	id: string;
	name: string;
	file_name: string | null;
}

interface Relation {
	id: number;
	title: string;
	image_internal: string | null;
	image_external: string | null;
	registed_at: Date;
}

/**
 * 日記記事
 */
export default class BlogEntryDao extends BlogDao {
	/**
	 * 記事データを取得する
	 *
	 * @param entryId - 記事 ID
	 *
	 * @returns 記事データ
	 */
	async getEntry(entryId: number): Promise<BlogDb.Entry | null> {
		interface Select {
			title: string;
			description: string | null;
			message: string;
			image_internal: string | null;
			image_external: string | null;
			registed_at: number;
			updated_at: number | null;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				title,
				description,
				message,
				image_internal,
				image_external,
				registed_at,
				updated_at
			FROM
				d_entry
			WHERE
				id = :id AND
				public = :public
		`);
		await sth.bind({
			':id': entryId,
			':public': true,
		});
		const row: Select | undefined = await sth.get();
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
			registed_at: DbUtil.unixToDate(row.registed_at)!,
			updated_at: DbUtil.unixToDate(row.updated_at),
			public: true,
		};
	}

	/**
	 * 記事のカテゴリー情報を取得
	 *
	 * @param entryId - 記事 ID
	 *
	 * @returns カテゴリー情報
	 */
	async getCategories(entryId: number): Promise<Category[]> {
		interface Select {
			id: string;
			name: string;
			file_name: string | null;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				c.id AS id,
				c.name AS name,
				cg.file_name AS file_name
			FROM
				d_entry_category ec,
				m_category c,
				m_catgroup cg
			WHERE
				ec.entry_id = :id AND
				ec.category_id = c.id AND
				c.catgroup = cg.id
			ORDER BY
				cg.sort,
				c.sort
		`);
		await sth.bind({
			':id': entryId,
		});
		const rows: Select[] = await sth.all();
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
	 * @param entryId - 記事 ID
	 *
	 * @returns 関連記事データ
	 */
	async getRelations(entryId: number): Promise<Relation[]> {
		interface Select {
			id: number;
			title: string;
			image_internal: string | null;
			image_external: string | null;
			registed_at: number;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				e.id AS id,
				e.title AS title,
				e.image_internal AS image_internal,
				e.image_external AS image_external,
				e.registed_at AS registed_at
			FROM
				d_entry e,
				d_entry_relation er
			WHERE
				er.entry_id = :id AND
				er.relation_id = e.id AND
				e.public = :public
			ORDER BY
				e.registed_at DESC
		`);
		await sth.bind({
			':id': entryId,
			':public': true,
		});
		const rows: Select[] = await sth.all();
		await sth.finalize();

		const relations: Relation[] = [];
		for (const row of rows) {
			relations.push({
				id: row.id,
				title: row.title,
				image_internal: row.image_internal,
				image_external: row.image_external,
				registed_at: DbUtil.unixToDate(row.registed_at)!,
			});
		}

		return relations;
	}
}
