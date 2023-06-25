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

		const messages: Map<number, string> = new Map();
		if (entryId === undefined) {
			const sth = await dbh.prepare(`
				SELECT
					id,
					message
				FROM
					d_topic
			`);
			const rows = await sth.all();
			await sth.finalize();

			for (const row of rows) {
				messages.set(row.id, row.message);
			}
		} else {
			const sth = await dbh.prepare(`
				SELECT
					message
				FROM
					d_topic
				WHERE
					id = :id
			`);
			await sth.bind({
				':id': entryId,
			});
			const row = await sth.get();
			await sth.finalize();

			messages.set(entryId, row.message);
		}

		return messages;
	}

	/**
	 * 記事データを修正する
	 *
	 * @param topicId - 記事 ID
	 * @param message - 本文
	 */
	public async update(topicId: number, message: string): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			const sth = await dbh.prepare(`
					UPDATE
						d_topic
					SET
						message = :message
					WHERE
						id = :id
				`);
			await sth.run({
				':message': message,
				':id': topicId,
			});
			await sth.finalize();

			await dbh.exec('COMMIT');
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
