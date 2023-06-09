import BlogDao from './BlogDao.js';
import DbUtil from '../util/DbUtil.js';

/**
 * 本文
 */
export default class BlogMessageDao extends BlogDao {
	/**
	 * ツイート情報を取得する
	 *
	 * @param {string} id - ツイート ID
	 *
	 * @returns {object} ツイート情報
	 */
	async getTweet(id: string): Promise<BlogDb.TweetData | null> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				name,
				screen_name AS username,
				text,
				created_at
			FROM
				d_tweet
			WHERE
				id = :id
		`);
		await sth.bind({
			':id': id,
		});
		const row = await sth.get();
		await sth.finalize();

		if (row === undefined) {
			return null;
		}

		return {
			id: id,
			name: row.name,
			username: row.username,
			text: row.text,
			created_at: <Date>DbUtil.unixToDate(row.created_at),
		};
	}
}
