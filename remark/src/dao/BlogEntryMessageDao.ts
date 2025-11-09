import BlogDao from './BlogDao.ts';

interface Entry {
	id: number;
	message: string;
}

/**
 * ブログ記事本文
 */
export default class BlogEntryMessageDao extends BlogDao {
	/**
	 * 記事の本文を取得する
	 *
	 * @param id - 記事 ID（未指定時は全記事を取得）
	 *
	 * @returns 記事の本文
	 */
	getEntriesMessage(id?: number): Entry[] {
		let rows: Entry[];
		if (id === undefined) {
			const stmt = this.db.prepare(`
				SELECT
					id,
					message
				FROM
					d_entry
			`);
			rows = stmt.all() as unknown as Entry[];
		} else {
			const stmt = this.db.prepare(`
				SELECT
					id,
					message
				FROM
					d_entry
				WHERE
					id = :id
			`);
			rows = stmt.all({
				':id': id,
			}) as unknown as Entry[];
		}

		return rows;
	}

	/**
	 * 記事データを修正する
	 *
	 * @param data - 登録データ
	 */
	update(data: Readonly<Entry>): void {
		const stmt = this.db.prepare(`
			UPDATE
				d_entry
			SET
				message = :message
			WHERE
				id = :id
		`);
		stmt.run({
			':message': data.message,
			':id': data.id,
		});
	}
}
