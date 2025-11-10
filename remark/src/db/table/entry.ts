import { db } from '../database.ts';
import type { EntryUpdate } from '../../../../db/@types.ts';

/**
 * 本文を取得する
 *
 * @param id - 記事 ID（未指定時は全記事を取得）
 *
 * @returns 記事 ID と本文が格納されたオブジェクトの配列
 */
export const findMessage = async (id?: number) => {
	let query = db.selectFrom('d_entry');

	if (id !== undefined) {
		query = query.where('id', '=', id);
	}

	return await query.select(['id', 'message']).execute();
};

/**
 * 本文を変更する
 *
 * @param id - 記事 ID
 * @param updateWith - 変更するデータ
 */
export const updateMessage = async (id: number, updateWith: Pick<EntryUpdate, 'message'>): Promise<void> => {
	await db.updateTable('d_entry').set(updateWith).where('id', '=', id).execute();
};
