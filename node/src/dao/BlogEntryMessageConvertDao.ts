import BlogDao from './BlogDao.js';

/**
 * 記事本文の構文書き換え
 */
export default class BlogEntryMessageConvertDao extends BlogDao {
	/**
	 * 全記事の本文を取得する
	 *
	 * @returns {Map} 全記事の本文
	 */
	async getAllEntriesMessage(): Promise<Map<number, string>> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id,
				message
			FROM
				d_topic
		`);
		const rows = await sth.all();
		await sth.finalize();

		const messages: Map<number, string> = new Map();
		for (const row of rows) {
			messages.set(row.id, row.message);
		}

		return messages;
	}

	/**
	 * 記事データを修正する
	 *
	 * @param {number} topicId - 記事 ID
	 * @param {string} message - 本文
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

			dbh.exec('COMMIT');
		} catch (e) {
			dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
