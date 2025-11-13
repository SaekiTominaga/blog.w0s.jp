import { sql, type Insertable, type Selectable, type Updateable } from 'kysely';
import { jsToSQLiteAssignment, jsToSQLiteComparison, sqliteToJS } from '@w0s/sqlite-utility';
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
			modified: jsToSQLiteAssignment(new Date()),
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
	 * @param entryData - 記事テーブルのデータ
	 * @param otherData - それ以外のデータ
	 * @param otherData.categoryIds - カテゴリー ID
	 * @param otherData.relationIds - 関連記事 ID
	 *
	 * @returns 登録した記事 ID
	 */
	async insert(
		entryData: Readonly<Omit<Insertable<DEntry>, 'registed_at' | 'updated_at'>>,
		otherData: Readonly<{
			categoryIds: string[] | undefined;
			relationIds: string[] | undefined;
		}>,
	): Promise<number> {
		let query = this.db.insertInto('d_entry');
		query = query.values({
			title: jsToSQLiteAssignment(entryData.title),
			description: jsToSQLiteAssignment(entryData.description),
			message: jsToSQLiteAssignment(entryData.message),
			image_internal: jsToSQLiteAssignment(entryData.image_internal),
			image_external: jsToSQLiteAssignment(entryData.image_external),
			registed_at: jsToSQLiteAssignment(new Date()),
			public: jsToSQLiteAssignment(entryData.public),
		});

		const result = await query.executeTakeFirst();

		const entryId = result.insertId;
		if (entryId === undefined) {
			throw new Error('Failed to INSERT into `d_entry` table.');
		}

		if (otherData.categoryIds !== undefined && otherData.categoryIds.length > 0) {
			let queryCategory = this.db.insertInto('d_entry_category');
			queryCategory = queryCategory.values(
				otherData.categoryIds.map((categoryId) => ({
					entry_id: jsToSQLiteAssignment(Number(entryId)),
					category_id: jsToSQLiteAssignment(categoryId),
				})),
			);

			await queryCategory.execute();
		}

		if (otherData.relationIds !== undefined && otherData.relationIds.length > 0) {
			let queryRelaton = this.db.insertInto('d_entry_relation');
			queryRelaton = queryRelaton.values(
				otherData.relationIds.map((relationId) => ({
					entry_id: jsToSQLiteAssignment(Number(entryId)),
					relation_id: jsToSQLiteAssignment(relationId),
				})),
			);

			await queryRelaton.execute();
		}

		return Number(entryId);
	}

	/**
	 * 記事データを修正する
	 *
	 * @param entryData - 記事テーブルのデータ
	 * @param otherData - それ以外のデータ
	 * @param otherData.categoryIds - カテゴリー ID
	 * @param otherData.relationIds - 関連記事 ID
	 * @param otherData.timestampUpdate - 更新日時を変更する
	 */
	async update(
		entryData: Readonly<Omit<Required<Updateable<DEntry>>, 'registed_at' | 'updated_at'>>,
		otherData: Readonly<{
			categoryIds: string[] | undefined;
			relationIds: string[] | undefined;
			timestampUpdate: boolean;
		}>,
	): Promise<void> {
		{
			let query = this.db.updateTable('d_entry');
			if (otherData.timestampUpdate) {
				query = query.set({
					title: jsToSQLiteAssignment(entryData.title),
					description: jsToSQLiteAssignment(entryData.description),
					message: jsToSQLiteAssignment(entryData.message),
					image_internal: jsToSQLiteAssignment(entryData.image_internal),
					image_external: jsToSQLiteAssignment(entryData.image_external),
					updated_at: jsToSQLiteAssignment(new Date()),
					public: jsToSQLiteAssignment(entryData.public),
				});
			} else {
				query = query.set({
					title: jsToSQLiteAssignment(entryData.title),
					description: jsToSQLiteAssignment(entryData.description),
					message: jsToSQLiteAssignment(entryData.message),
					image_internal: jsToSQLiteAssignment(entryData.image_internal),
					image_external: jsToSQLiteAssignment(entryData.image_external),
					public: jsToSQLiteAssignment(entryData.public),
				});
			}
			query = query.where('id', '=', jsToSQLiteComparison(entryData.id));

			await query.executeTakeFirst();
		}

		{
			let deleteQuery = this.db.deleteFrom('d_entry_category');
			deleteQuery = deleteQuery.where('entry_id', '=', entryData.id);

			await deleteQuery.executeTakeFirst();

			if (otherData.categoryIds !== undefined && otherData.categoryIds.length > 0) {
				let insertQuery = this.db.insertInto('d_entry_category');
				insertQuery = insertQuery.values(
					otherData.categoryIds.map((categoryId) => ({
						entry_id: jsToSQLiteAssignment(entryData.id),
						category_id: jsToSQLiteAssignment(categoryId),
					})),
				);

				await insertQuery.execute();
			}
		}

		{
			let deleteQuery = this.db.deleteFrom('d_entry_relation');
			deleteQuery = deleteQuery.where('entry_id', '=', entryData.id);

			await deleteQuery.executeTakeFirst();

			if (otherData.relationIds !== undefined && otherData.relationIds.length > 0) {
				let insertQuery = this.db.insertInto('d_entry_relation');
				insertQuery = insertQuery.values(
					otherData.relationIds.map((relationId) => ({
						entry_id: jsToSQLiteAssignment(entryData.id),
						relation_id: jsToSQLiteAssignment(relationId),
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
