import { jsToSQLiteComparison, sqliteToJS } from '@w0s/sqlite-utility';
import type { DEntry } from '../../../@types/db.d.ts';
import Database from './Database.ts';

export default class extends Database {
	/**
	 * 本文を取得する
	 *
	 * @param id - 記事 ID（未指定時は全記事を取得）
	 *
	 * @returns 記事 ID と本文が格納されたオブジェクトの配列
	 */
	findMessage = async (id?: number) => {
		let query = this.db.selectFrom('d_entry').select(['id', 'message']);
		if (id !== undefined) {
			query = query.where('id', '=', jsToSQLiteComparison(id));
		}

		const rows = await query.execute();

		return rows.map((row) => ({
			id: sqliteToJS(row.id),
			message: sqliteToJS(row.message),
		}));
	};

	/**
	 * 本文を変更する
	 *
	 * @param id - 記事 ID
	 * @param updateWith - 変更するデータ
	 */
	updateMessage = async (id: number, updateWith: Readonly<Pick<DEntry, 'message'>>): Promise<void> => {
		let query = this.db.updateTable('d_entry');
		query = query.set(updateWith);
		query = query.where('id', '=', jsToSQLiteComparison(id));

		await query.executeTakeFirst();
	};
}
