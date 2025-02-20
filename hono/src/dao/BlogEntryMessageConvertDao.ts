import BlogDao from './BlogDao.js';

/**
 * 記事本文の構文書き換え
 */
export default class BlogEntryMessageConvertDao extends BlogDao {
	/**
	 * 記事の本文を取得する
	 *
	 * @param entryId - 記事 ID（未指定時は全記事を取得）
	 *
	 * @returns 全記事の本文
	 */
	async getEntriesMessage(entryId?: number): Promise<Map<number, string>> {
		const dbh = await this.getDbh();

		const messages = new Map<number, string>();
		if (entryId === undefined) {
			interface Select {
				id: number;
				message: string;
			}

			const sth = await dbh.prepare(`
				SELECT
					id,
					message
				FROM
					d_entry
			`);
			const rows = await sth.all<Select[]>();
			await sth.finalize();

			for (const row of rows) {
				messages.set(row.id, row.message);
			}
		} else {
			interface Select {
				message: string;
			}

			const sth = await dbh.prepare(`
				SELECT
					message
				FROM
					d_entry
				WHERE
					id = :id
			`);
			await sth.bind({
				':id': entryId,
			});
			const row = await sth.get<Select>();
			await sth.finalize();

			if (row !== undefined) {
				messages.set(entryId, row.message);
			}
		}

		return messages;
	}

	/**
	 * 記事データを修正する
	 *
	 * @param entryId - 記事 ID
	 * @param message - 本文
	 */
	public async update(entryId: number, message: string): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			const sth = await dbh.prepare(`
				UPDATE
					d_entry
				SET
					message = :message
				WHERE
					id = :id
			`);
			await sth.run({
				':message': message,
				':id': entryId,
			});
			await sth.finalize();

			await dbh.exec('COMMIT');
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
