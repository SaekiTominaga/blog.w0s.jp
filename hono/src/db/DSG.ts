import { jsToSQLiteAssignment } from '@w0s/sqlite-utility';
import Database from './Database.ts';

/**
 * DSG のキャッシュクリア
 */
export default class extends Database {
	/**
	 * 最終更新日時を記録する
	 *
	 * @returns 日付
	 */
	async updateModified(): Promise<Date> {
		const now = new Date();

		let query = this.db.updateTable('d_info');
		query = query.set({
			modified: jsToSQLiteAssignment(now),
		});

		await query.executeTakeFirst();

		return now;
	}
}
