import BlogDao from './BlogDao.js';

interface AmazonData {
	asin: string;
	url: string;
	title: string;
	binding: string | null;
	product_group: string | null;
	date: Date | null;
	image_url: string | null;
	image_width: number | null;
	image_height: number | null;
}

/**
 * 本文
 */
export default class BlogMessageDao extends BlogDao {
	/**
	 * Amazon 商品情報を取得する
	 *
	 * @param {string} asin - ASIN
	 *
	 * @returns {object} Amazon 商品情報
	 */
	async getAmazon(asin: string): Promise<AmazonData | null> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				url,
				title,
				binding,
				product_group,
				date,
				image_url,
				image_width,
				image_height
			FROM
				d_amazon
			WHERE
				asin = :asin
		`);
		await sth.bind({
			':asin': asin,
		});
		const row = await sth.get();
		await sth.finalize();

		if (row === undefined) {
			return null;
		}

		return {
			asin: asin,
			url: row.url,
			title: row.title,
			binding: row.binding,
			product_group: row.product_group,
			date: row.date !== null ? new Date(Number(row.date) * 1000) : null,
			image_url: row.image_url,
			image_width: Number(row.image_width),
			image_height: Number(row.image_height),
		};
	}

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
			created_at: new Date(Number(row.created_at) * 1000),
		};
	}
}
