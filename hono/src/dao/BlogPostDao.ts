import DbUtil from '../util/DbUtil.js';
import BlogDao from './BlogDao.js';

interface CategoryMaster {
	group_name: string;
	id: string;
	name: string;
}

export interface ReviseData {
	id: number;
	title: string;
	description: string | null;
	message: string;
	category_ids: string[];
	image_internal: string | null;
	image_external: string | null;
	relation_ids: string[];
	public: boolean;
}

/**
 * 記事投稿
 */
export default class BlogPostDao extends BlogDao {
	/**
	 * 最新記事 ID を取得
	 *
	 * @returns 最新記事 ID （記事が1件も登録されていない場合は 0 ）
	 */
	async getLatestId(): Promise<number> {
		interface Select {
			id: number;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id
			FROM
				d_entry
			ORDER BY
				registed_at DESC
			LIMIT 1
		`);

		const row: Select | undefined = await sth.get();
		await sth.finalize();

		if (row === undefined) {
			return 0;
		}

		return row.id;
	}

	/**
	 * 最終更新日時を記録する
	 */
	async updateModified(): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			/* いったんクリア */
			await dbh.run(`
				DELETE FROM
					d_info
			`);

			/* 現在日時を記録 */
			const insertSth = await dbh.prepare(`
				INSERT INTO d_info
					(modified)
				VALUES
					(:modified)
			`);
			await insertSth.run({
				':modified': DbUtil.dateToUnix(),
			});
			await insertSth.finalize();

			await dbh.exec('COMMIT');
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}

	/**
	 * カテゴリー情報を取得
	 *
	 * @returns カテゴリー情報
	 */
	async getCategoryMaster(): Promise<CategoryMaster[]> {
		interface Select {
			group_name: string;
			id: string;
			name: string;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				cg.name AS group_name,
				c.id AS id,
				c.name AS name
			FROM
				m_category c,
				m_catgroup cg
			WHERE
				c.catgroup = cg.id
			ORDER BY
				cg.sort,
				c.sort
		`);

		const rows: Select[] = await sth.all();
		await sth.finalize();

		const categories: CategoryMaster[] = [];
		for (const row of rows) {
			categories.push({
				group_name: row.group_name,
				id: row.id,
				name: row.name,
			});
		}

		return categories;
	}

	/**
	 * 記事タイトル重複チェック
	 *
	 * @param title - 記事タイトル
	 * @param entryId - 記事 ID（記事修正時、自記事をチェック対象から除外するのに使用）
	 *
	 * @returns 同一の記事タイトルがあれば true
	 */
	async isExistsTitle(title: string, entryId?: number): Promise<boolean> {
		interface Select {
			count: number;
		}

		const dbh = await this.getDbh();

		if (entryId !== undefined) {
			const sth = await dbh.prepare(`
				SELECT
					COUNT() AS count
				FROM
					d_entry
				WHERE
					id != :id AND
					title = :title
			`);
			await sth.bind({
				':id': entryId,
				':title': title,
			});

			const row: Select | undefined = await sth.get();
			await sth.finalize();

			return row !== undefined && row.count > 0;
		}

		const sth = await dbh.prepare(`
			SELECT
				COUNT() AS count
			FROM
				d_entry
			WHERE
				title = :title
			LIMIT 1
		`);
		await sth.bind({
			':title': title,
		});

		const row: Select | undefined = await sth.get();
		await sth.finalize();

		return row !== undefined && row.count > 0;
	}

	/**
	 * 記事データを登録する
	 *
	 * @param title - タイトル
	 * @param description - 概要
	 * @param message - 本文
	 * @param categoryIds - カテゴリー ID
	 * @param imagePath - 画像パス
	 * @param relationIds - 関連記事 ID
	 * @param publicFlag - 公開フラグ
	 *
	 * @returns 登録した記事 ID
	 */
	async insert(
		title: string,
		description: string | undefined,
		message: string,
		categoryIds: string[] | undefined,
		imagePath: string | undefined,
		relationIds: string[] | undefined,
		publicFlag: boolean,
	): Promise<number> {
		const dbh = await this.getDbh();

		let imageInternal: string | null = null;
		let imageExternal: string | null = null;
		if (imagePath !== undefined) {
			try {
				new URL(imagePath); /* eslint-disable-line no-new */
				imageExternal = imagePath;
			} catch {
				imageInternal = imagePath;
			}
		}

		await dbh.exec('BEGIN');
		try {
			const entryInsertSth = await dbh.prepare(`
				INSERT INTO d_entry
					(title, description, message, image_internal, image_external, registed_at, public)
				VALUES
					(:title, :description, :message, :image_internal, :image_external, :registed_at, :public)
			`);
			const entryInsertResult = await entryInsertSth.run({
				':title': title,
				':description': DbUtil.emptyToNull(description ?? null),
				':message': message,
				':image_internal': imageInternal,
				':image_external': imageExternal,
				':registed_at': DbUtil.dateToUnix(),
				':public': publicFlag,
			});
			await entryInsertSth.finalize();

			const entryId = entryInsertResult.lastID;
			if (entryId === undefined) {
				throw new Error('Failed to INSERT into `d_entry` table.');
			}

			if (categoryIds !== undefined && categoryIds.length > 0) {
				const categoryInsertSth = await dbh.prepare(`
					INSERT INTO d_entry_category
						(entry_id, category_id)
					VALUES
						(:entry_id, :category_id)
				`);
				await Promise.all(
					categoryIds.map(async (categoryId) => {
						await categoryInsertSth.run({
							':entry_id': entryId,
							':category_id': categoryId,
						});
					}),
				);
				await categoryInsertSth.finalize();
			}

			if (relationIds !== undefined && relationIds.length > 0) {
				const relationInsertSth = await dbh.prepare(`
					INSERT INTO d_entry_relation
						(entry_id, relation_id)
					VALUES
						(:entry_id, :relation_id)
				`);
				await Promise.all(
					relationIds.map(async (relationId) => {
						await relationInsertSth.run({
							':entry_id': entryId,
							':relation_id': relationId,
						});
					}),
				);
				await relationInsertSth.finalize();
			}

			await dbh.exec('COMMIT');

			return entryId;
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}

	/**
	 * 記事データを修正する
	 *
	 * @param entryId - 記事 ID
	 * @param title - タイトル
	 * @param description - 概要
	 * @param message - 本文
	 * @param categoryIds - カテゴリー ID
	 * @param imagePath - 画像パス
	 * @param relationIds - 関連記事 ID
	 * @param publicFlag - 公開フラグ
	 * @param timestampUpdate - 更新日時を変更する
	 */
	async update(
		entryId: number,
		title: string,
		description: string | undefined,
		message: string,
		categoryIds: string[] | undefined,
		imagePath: string | undefined,
		relationIds: string[] | undefined,
		publicFlag: boolean,
		timestampUpdate: boolean,
	): Promise<void> {
		const dbh = await this.getDbh();

		let imageInternal = null;
		let imageExternal = null;
		if (imagePath !== undefined) {
			try {
				new URL(imagePath); /* eslint-disable-line no-new */
				imageExternal = imagePath;
			} catch {
				imageInternal = imagePath;
			}
		}

		await dbh.exec('BEGIN');
		try {
			if (timestampUpdate) {
				const entryUpdateSth = await dbh.prepare(`
					UPDATE
						d_entry
					SET
						title = :title,
						description = :description,
						message = :message,
						image_internal = :image_internal,
						image_external = :image_external,
						updated_at = :updated_at,
						public = :public
					WHERE
						id = :entry_id
				`);
				await entryUpdateSth.run({
					':title': title,
					':description': DbUtil.emptyToNull(description ?? null),
					':message': message,
					':image_internal': imageInternal,
					':image_external': imageExternal,
					':updated_at': DbUtil.dateToUnix(),
					':public': publicFlag,
					':entry_id': entryId,
				});
				await entryUpdateSth.finalize();
			} else {
				const entryUpdateSth = await dbh.prepare(`
					UPDATE
						d_entry
					SET
						title = :title,
						description = :description,
						message = :message,
						image_internal = :image_internal,
						image_external = :image_external,
						public = :public
					WHERE
						id = :entry_id
				`);
				await entryUpdateSth.run({
					':title': title,
					':description': DbUtil.emptyToNull(description ?? null),
					':message': message,
					':image_internal': imageInternal,
					':image_external': imageExternal,
					':public': publicFlag,
					':entry_id': entryId,
				});
				await entryUpdateSth.finalize();
			}

			const categoryDeleteSth = await dbh.prepare(`
				DELETE FROM
					d_entry_category
				WHERE
					entry_id = :entry_id
			`);
			await categoryDeleteSth.run({
				':entry_id': entryId,
			});
			await categoryDeleteSth.finalize();

			if (categoryIds !== undefined && categoryIds.length > 0) {
				const categoryInsertSth = await dbh.prepare(`
					INSERT INTO d_entry_category
						(entry_id, category_id)
					VALUES
						(:entry_id, :category_id)
				`);
				await Promise.all(
					categoryIds.map(async (categoryId) => {
						await categoryInsertSth.run({
							':entry_id': entryId,
							':category_id': categoryId,
						});
					}),
				);
				await categoryInsertSth.finalize();
			}

			const relationDeleteSth = await dbh.prepare(`
				DELETE FROM
					d_entry_relation
				WHERE
					entry_id = :entry_id
			`);
			await relationDeleteSth.run({
				':entry_id': entryId,
			});
			await relationDeleteSth.finalize();

			if (relationIds !== undefined && relationIds.length > 0) {
				const relationInsertSth = await dbh.prepare(`
					INSERT INTO d_entry_relation
						(entry_id, relation_id)
					VALUES
						(:entry_id, :relation_id)
				`);
				await Promise.all(
					relationIds.map(async (relationId) => {
						await relationInsertSth.run({
							':entry_id': entryId,
							':relation_id': relationId,
						});
					}),
				);
				await relationInsertSth.finalize();
			}

			await dbh.exec('COMMIT');
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}

	/**
	 * 修正する記事データを取得する
	 *
	 * @param id - 記事 ID
	 *
	 * @returns 記事データ
	 */
	async getReviseData(id: number): Promise<ReviseData | undefined> {
		interface Select {
			title: string;
			description: string | null;
			message: string;
			category_ids: string | null;
			image_internal: string | null;
			image_external: string | null;
			relation_ids: string | null;
			public: number;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				e.title,
				e.description,
				e.message,
				(SELECT group_concat(ec.category_id, " ") FROM d_entry_category ec WHERE e.id = ec.entry_id ORDER BY ec.category_id) AS category_ids,
				e.image_internal,
				e.image_external,
				(SELECT group_concat(er.relation_id, " ") FROM d_entry_relation er WHERE e.id = er.entry_id) AS relation_ids,
				e.public
			FROM
				d_entry e
			WHERE
				e.id = :id
		`);
		await sth.bind({
			':id': id,
		});

		const row: Select | undefined = await sth.get();
		await sth.finalize();

		if (row === undefined) {
			return undefined;
		}

		return {
			id: id,
			title: row.title,
			description: row.description,
			message: row.message,
			category_ids: row.category_ids !== null ? row.category_ids.split(' ') : [],
			image_internal: row.image_internal,
			image_external: row.image_external,
			relation_ids: row.relation_ids !== null ? row.relation_ids.split(' ') : [],
			public: Boolean(row.public),
		};
	}
}
