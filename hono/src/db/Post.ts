import { sql, type Selectable } from 'kysely';
import { jsToSQLite, sqliteToJS } from '@w0s/sqlite-utility';
import type { DEntry } from '../../../@types/db.d.ts';
import Database from './Database.ts';

export type ReviseData = Pick<Selectable<DEntry>, 'id' | 'title' | 'description' | 'message' | 'image_internal' | 'image_external' | 'public'> & {
	category_ids: string[];
	relation_ids: string[];
};

/**
 * 記事投稿
 */
export default class extends Database {
	/**
	 * 最新記事 ID を取得
	 *
	 * @returns 最新記事 ID （記事が1件も登録されていない場合は 0 ）
	 */
	async getLatestId(): Promise<number> {
		let query = this.db.selectFrom('d_entry').select('id');

		query = query.orderBy('registed_at', 'desc');

		const row = await query.executeTakeFirst();
		if (row === undefined) {
			return 0;
		}

		return sqliteToJS(row.id);
	}

	/**
	 * 最終更新日時を記録する
	 */
	async updateModified(): Promise<void> {
		let query = this.db.updateTable('d_info');
		query = query.set({
			modified: jsToSQLite(new Date()),
		});

		await query.executeTakeFirst();
	}

	/**
	 * カテゴリー情報を取得
	 *
	 * @returns カテゴリー情報
	 */
	async getCategoryMaster(): Promise<
		{
			group_name: string;
			id: string;
			name: string;
		}[]
	> {
		let query = this.db.selectFrom(['m_category as c', 'm_catgroup as cg']).select(['cg.name as group_name', 'c.id as id', 'c.name as name']);
		query = query.whereRef('c.catgroup', '=', 'cg.id');
		query = query.orderBy('cg.sort');
		query = query.orderBy('c.sort');

		const rows = await query.execute();

		return rows.map((row) => ({
			group_name: sqliteToJS(row.group_name),
			id: sqliteToJS(row.id),
			name: sqliteToJS(row.name),
		}));
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
		let query = this.db.selectFrom('d_entry').select([sql<number>`COUNT()`.as('count')]);
		if (entryId !== undefined) {
			query = query.where('id', '!=', entryId);
		}
		query = query.where('title', '!=', title);

		const row = await query.executeTakeFirst();

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
		let query = this.db.insertInto('d_entry');
		query = query.values({
			title: jsToSQLite(title),
			description: jsToSQLite(description),
			message: jsToSQLite(message),
			image_internal: jsToSQLite(imageInternal),
			image_external: jsToSQLite(imageExternal),
			registed_at: jsToSQLite(new Date()),
			public: jsToSQLite(publicFlag),
		});

		const result = await query.executeTakeFirst();

		const entryId = result.insertId;
		if (entryId === undefined) {
			throw new Error('Failed to INSERT into `d_entry` table.');
		}

		if (categoryIds !== undefined && categoryIds.length > 0) {
			let queryCategory = this.db.insertInto('d_entry_category');
			queryCategory = queryCategory.values(
				categoryIds.map((categoryId) => ({
					entry_id: jsToSQLite(Number(entryId)),
					category_id: jsToSQLite(categoryId),
				})),
			);

			await queryCategory.execute();
		}

		if (relationIds !== undefined && relationIds.length > 0) {
			let queryRelaton = this.db.insertInto('d_entry_relation');
			queryRelaton = queryRelaton.values(
				relationIds.map((relationId) => ({
					entry_id: jsToSQLite(Number(entryId)),
					relation_id: jsToSQLite(relationId),
				})),
			);

			await queryRelaton.execute();
		}

		return Number(entryId);
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
		{
			let query = this.db.updateTable('d_entry');
			if (timestampUpdate) {
				query = query.set({
					title: jsToSQLite(title),
					description: jsToSQLite(description),
					message: jsToSQLite(message),
					image_internal: jsToSQLite(imageInternal),
					image_external: jsToSQLite(imageExternal),
					updated_at: jsToSQLite(new Date()),
					public: jsToSQLite(publicFlag),
				});
			} else {
				query = query.set({
					title: jsToSQLite(title),
					description: jsToSQLite(description),
					message: jsToSQLite(message),
					image_internal: jsToSQLite(imageInternal),
					image_external: jsToSQLite(imageExternal),
					public: jsToSQLite(publicFlag),
				});
			}
			query = query.where('id', '=', jsToSQLite(entryId));

			await query.executeTakeFirst();
		}

		{
			let deleteQuery = this.db.deleteFrom('d_entry_category');
			deleteQuery = deleteQuery.where('entry_id', '=', entryId);

			await deleteQuery.executeTakeFirst();

			if (categoryIds !== undefined && categoryIds.length > 0) {
				let insertQuery = this.db.insertInto('d_entry_category');
				insertQuery = insertQuery.values(
					categoryIds.map((categoryId) => ({
						entry_id: jsToSQLite(entryId),
						category_id: jsToSQLite(categoryId),
					})),
				);

				await insertQuery.execute();
			}
		}

		{
			let deleteQuery = this.db.deleteFrom('d_entry_relation');
			deleteQuery = deleteQuery.where('entry_id', '=', entryId);

			await deleteQuery.executeTakeFirst();

			if (relationIds !== undefined && relationIds.length > 0) {
				let insertQuery = this.db.insertInto('d_entry_relation');
				insertQuery = insertQuery.values(
					relationIds.map((relationId) => ({
						entry_id: jsToSQLite(entryId),
						relation_id: jsToSQLite(relationId),
					})),
				);

				await insertQuery.execute();
			}
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
		let query = this.db
			.selectFrom('d_entry as e')
			.select([
				'e.title',
				'e.description',
				'e.message',
				sql<string | null>`(SELECT group_concat(ec.category_id, ' ') FROM d_entry_category ec WHERE e.id = ec.entry_id ORDER BY ec.category_id)`.as(
					'category_ids',
				),
				'e.image_internal',
				'e.image_external',
				sql<string | null>`(SELECT group_concat(er.relation_id, ' ') FROM d_entry_relation er WHERE e.id = er.entry_id ORDER BY er.relation_id)`.as(
					'relation_ids',
				),
				'e.public',
			]);
		query = query.where('e.id', '=', id);

		const row = await query.executeTakeFirst();
		if (row === undefined) {
			return undefined;
		}

		return {
			id: sqliteToJS(id),
			title: sqliteToJS(row.title),
			description: sqliteToJS(row.description),
			message: sqliteToJS(row.message),
			category_ids: sqliteToJS(row.category_ids)?.split(' ') ?? [],
			image_internal: sqliteToJS(row.image_internal),
			image_external: sqliteToJS(row.image_external, 'url'),
			relation_ids: sqliteToJS(row.relation_ids)?.split(' ') ?? [],
			public: sqliteToJS(row.public, 'boolean'),
		};
	}
}
