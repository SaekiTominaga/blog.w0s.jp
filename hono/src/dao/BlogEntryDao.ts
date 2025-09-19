import { sqliteToJS } from '@w0s/sqlite-utility';
import BlogDao from './BlogDao.ts';

interface Category {
	id: string;
	name: string;
	fileName: string | undefined;
}

interface Relation {
	id: number;
	title: string;
	imageInternal: string | undefined;
	imageExternal: URL | undefined;
	registedAt: Date;
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
		const row = await sth.get<Select>();
		await sth.finalize();

		if (row === undefined) {
			return null;
		}

		return {
			id: sqliteToJS(entryId),
			title: sqliteToJS(row.title),
			description: sqliteToJS(row.description),
			message: sqliteToJS(row.message),
			imageInternal: sqliteToJS(row.image_internal),
			imageExternal: sqliteToJS(row.image_external, 'url'),
			registedAt: sqliteToJS(row.registed_at, 'date'),
			updatedAt: sqliteToJS(row.updated_at, 'date'),
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
		const rows = await sth.all<Select[]>();
		await sth.finalize();

		return rows.map(
			(row): Category => ({
				id: sqliteToJS(row.id),
				name: sqliteToJS(row.name),
				fileName: sqliteToJS(row.file_name),
			}),
		);
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
		const rows = await sth.all<Select[]>();
		await sth.finalize();

		return rows.map(
			(row): Relation => ({
				id: sqliteToJS(row.id),
				title: sqliteToJS(row.title),
				imageInternal: sqliteToJS(row.image_internal),
				imageExternal: sqliteToJS(row.image_external, 'url'),
				registedAt: sqliteToJS(row.registed_at, 'date'),
			}),
		);
	}
}
