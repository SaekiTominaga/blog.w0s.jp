import BlogDao from './BlogDao.js';

/**
 * Tweet
 */
export default class BlogTweetDao extends BlogDao {
	/**
	 * DB に登録されている全ツイート ID を取得する
	 *
	 * @returns {Array} 全ツイート ID
	 */
	async getAllTweetIds(): Promise<string[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id
			FROM
				d_tweet
		`);
		const rows = await sth.all();
		await sth.finalize();

		const tweetIds: string[] = [];
		for (const row of rows) {
			tweetIds.push(row.id);
		}

		return tweetIds;
	}

	/**
	 * ツイート情報を登録する
	 *
	 * @param {Array} tweetDataList - 登録するツイート情報
	 */
	async insert(tweetDataList: BlogDb.TweetData[]): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			const sth = await dbh.prepare(`
				INSERT INTO d_tweet
					(id, name, screen_name, text, created_at)
				VALUES
					(:id, :name, :username, :text, :created_at)
			`);
			await Promise.all(
				tweetDataList.map(async (tweetData) => {
					await sth.run({
						':id': tweetData.id,
						':name': tweetData.name,
						':username': tweetData.username,
						':text': tweetData.text,
						':created_at': Math.round(tweetData.created_at.getTime() / 1000),
					});
				})
			);
			await sth.finalize();
			dbh.exec('COMMIT');
		} catch (e) {
			dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
