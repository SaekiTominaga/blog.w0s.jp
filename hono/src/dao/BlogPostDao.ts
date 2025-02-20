import * as sqlite from 'sqlite';
import { prepareDelete, prepareInsert, prepareUpdate, sqliteToJS } from '../util/sql.js';
import BlogDao from './BlogDao.js';

interface CategoryMaster {
	groupName: string;
	id: string;
	name: string;
}

export interface ReviseData {
	id: number;
	title: string;
	description: string | undefined;
	message: string;
	categoryIds: string[];
	imageInternal: string | undefined;
	imageExternal: URL | undefined;
	relationIds: string[];
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

		const row = await sth.get<Select>();
		await sth.finalize();

		if (row === undefined) {
			return 0;
		}

		return sqliteToJS(row.id);
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
			const { sqlInto, sqlValues, bindParams } = prepareInsert({
				modified: new Date(),
			});

			const sth = await dbh.prepare(`
				INSERT INTO
					d_info
					${sqlInto}
				VALUES
					${sqlValues}
			`);
			await sth.run(bindParams);
			await sth.finalize();

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

		const rows = await sth.all<Select[]>();
		await sth.finalize();

		return rows.map(
			(row): CategoryMaster => ({
				groupName: sqliteToJS(row.group_name),
				id: sqliteToJS(row.id),
				name: sqliteToJS(row.name),
			}),
		);
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

		let sth: sqlite.Statement;
		if (entryId !== undefined) {
			sth = await dbh.prepare(`
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
		} else {
			sth = await dbh.prepare(`
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
		}

		const row = await sth.get<Select>();
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
	 * @param imageInternal - 内部画像パス
	 * @param imageExternal - 外部画像 URL
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
		imageInternal: string | undefined,
		imageExternal: URL | undefined,
		relationIds: string[] | undefined,
		publicFlag: boolean,
	): Promise<number> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			const { sqlInto, sqlValues, bindParams } = prepareInsert({
				title: title,
				description: description,
				message: message,
				image_internal: imageInternal,
				image_external: imageExternal,
				registed_at: new Date(),
				public: publicFlag,
			});

			const sth = await dbh.prepare(`
				INSERT INTO
					d_entry
					${sqlInto}
				VALUES
					${sqlValues}
			`);
			const result = await sth.run(bindParams);
			await sth.finalize();

			const entryId = result.lastID;
			if (entryId === undefined) {
				throw new Error('Failed to INSERT into `d_entry` table.');
			}

			if (categoryIds !== undefined && categoryIds.length > 0) {
				const categorySth = await dbh.prepare(`
					INSERT INTO
						d_entry_category
						(entry_id, category_id)
					VALUES
						(:entry_id, :category_id)
				`);

				await Promise.all(
					categoryIds.map(async (categoryId) => {
						await categorySth.run({
							':entry_id': entryId,
							':category_id': categoryId,
						});
					}),
				);
				await categorySth.finalize();
			}

			if (relationIds !== undefined && relationIds.length > 0) {
				const relationSth = await dbh.prepare(`
					INSERT INTO
						d_entry_relation
						(entry_id, relation_id)
					VALUES
						(:entry_id, :relation_id)
				`);

				await Promise.all(
					relationIds.map(async (relationId) => {
						await relationSth.run({
							':entry_id': entryId,
							':relation_id': relationId,
						});
					}),
				);
				await relationSth.finalize();
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
	 * @param imageInternal - 内部画像パス
	 * @param imageExternal - 外部画像 URL
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
		imageInternal: string | undefined,
		imageExternal: URL | undefined,
		relationIds: string[] | undefined,
		publicFlag: boolean,
		timestampUpdate: boolean,
	): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			{
				const { sqlSet, sqlWhere, bindParams } = prepareUpdate(
					timestampUpdate
						? {
								title: title,
								description: description,
								message: message,
								image_internal: imageInternal,
								image_external: imageExternal,
								updated_at: new Date(),
								public: publicFlag,
							}
						: {
								title: title,
								description: description,
								message: message,
								image_internal: imageInternal,
								image_external: imageExternal,
								public: publicFlag,
							},
					{
						id: entryId,
					},
				);

				const entryUpdateSth = await dbh.prepare(`
					UPDATE
						d_entry
					SET
						${sqlSet}
					WHERE
						${sqlWhere}
				`);
				await entryUpdateSth.run(bindParams);
				await entryUpdateSth.finalize();
			}

			{
				const { sqlWhere, bindParams } = prepareDelete({
					entry_id: entryId,
				});

				const categoryDeleteSth = await dbh.prepare(`
					DELETE FROM
						d_entry_category
					WHERE
						${sqlWhere}
				`);
				await categoryDeleteSth.run(bindParams);
				await categoryDeleteSth.finalize();
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

			{
				const { sqlWhere, bindParams } = prepareDelete({
					entry_id: entryId,
				});

				const relationDeleteSth = await dbh.prepare(`
					DELETE FROM
						d_entry_relation
					WHERE
						${sqlWhere}
				`);
				await relationDeleteSth.run(bindParams);
				await relationDeleteSth.finalize();
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

		const row = await sth.get<Select>();
		await sth.finalize();

		if (row === undefined) {
			return undefined;
		}

		return {
			id: sqliteToJS(id),
			title: sqliteToJS(row.title),
			description: sqliteToJS(row.description),
			message: sqliteToJS(row.message),
			categoryIds: sqliteToJS(row.category_ids)?.split(' ') ?? [],
			imageInternal: sqliteToJS(row.image_internal),
			imageExternal: sqliteToJS(row.image_external, 'url'),
			relationIds: sqliteToJS(row.relation_ids)?.split(' ') ?? [],
			public: sqliteToJS(row.public, 'boolean'),
		};
	}
}
