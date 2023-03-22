import BlogDao from './BlogDao.js';
import DbUtil from '../util/DbUtil.js';

/**
 * Amazon
 */
export default class BlogAmazonDao extends BlogDao {
	/**
	 * 発売日でソートした全商品リストを取得
	 *
	 * @returns {object[]} 全商品リスト
	 */
	async getDpsOrderByPublicationDate(): Promise<BlogDb.AmazonData[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				asin,
				url,
				title,
				binding,
				product_group,
				date AS publication_date,
				image_url,
				image_width,
				image_height,
				last_updated AS updated_at
			FROM
				d_amazon a
			ORDER BY
				date DESC
		`);

		const rows = await sth.all();
		await sth.finalize();

		const dps: BlogDb.AmazonData[] = [];
		for (const row of rows) {
			dps.push({
				asin: row.asin,
				url: row.url,
				title: row.title,
				binding: row.binding,
				product_group: row.product_group,
				publication_date: DbUtil.unixToDate(row.publication_date),
				image_url: row.image_url,
				image_width: row.image_width,
				image_height: row.image_height,
				updated_at: row.updated_at,
			});
		}

		return dps;
	}

	/**
	 * 商品が使われている記事を取得
	 *
	 * @param {string} asin - ASIN
	 *
	 * @returns {number[]} 記事 ID
	 */
	async getEntryIds(asin: string): Promise<number[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				CASE
					WHEN (SELECT count(tc.topic_id) FROM d_topic_category tc WHERE tc.topic_id = t.id) > 0 THEN t.id
				END AS topic_id
			FROM
				d_topic t
			WHERE
				t.message LIKE "% " || :asin || "%"
		`);
		await sth.bind({
			':asin': asin,
		});
		const rows = await sth.all();
		await sth.finalize();

		const entryIds: number[] = [];
		for (const row of rows) {
			if (row.topic_id !== null) {
				entryIds.push(row.topic_id);
			}
		}

		return entryIds;
	}

	/**
	 * 全 ASIN を取得する
	 *
	 * @returns {string[]} 全 ASIN
	 */
	async getAsins(): Promise<string[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				asin
			FROM
				d_amazon
		`);
		const rows = await sth.all();
		await sth.finalize();

		const asins: string[] = [];
		for (const row of rows) {
			asins.push(row.asin);
		}

		return asins;
	}

	/**
	 * 対象商品の画像 URL を取得する
	 *
	 * @param {string[]} asins - ASIN
	 *
	 * @returns {string[]} 画像 URL
	 */
	async getImageUrls(asins: string[]): Promise<string[]> {
		const dbh = await this.getDbh();

		const asinsArray = Array.from(asins);
		const bind = new Map<number, string>();
		asinsArray.forEach((asin, i) => {
			bind.set(i + 1, asin);
		});

		const sth = await dbh.prepare(`
			SELECT
				image_url
			FROM
				d_amazon
			WHERE
				asin IN (${asinsArray.fill('?')})
		`);
		await sth.bind(Object.fromEntries(bind));
		const rows = await sth.all();
		await sth.finalize();

		const imageUrls: string[] = [];
		for (const row of rows) {
			imageUrls.push(row.image_url);
		}

		return imageUrls;
	}

	/**
	 * 商品情報を登録する
	 *
	 * @param {Array} amazonDataList - 登録する商品情報
	 */
	async insert(amazonDataList: BlogDb.AmazonData[]): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			const sth = await dbh.prepare(`
				INSERT INTO
					d_amazon
					(asin, url, title, binding, product_group, date, image_url, image_width, image_height, last_updated)
				VALUES
					(:asin, :url, :title, :binding, :product_group, :date, :image_url, :image_width, :image_height, :last_updated)
			`);
			await Promise.all(
				amazonDataList.map(async (amazonData) => {
					await sth.run({
						':asin': amazonData.asin,
						':url': amazonData.url,
						':title': amazonData.title,
						':binding': amazonData.binding,
						':product_group': amazonData.product_group,
						':date': amazonData.publication_date !== null ? Math.round(amazonData.publication_date.getTime() / 1000) : null,
						':image_url': amazonData.image_url,
						':image_width': amazonData.image_width,
						':image_height': amazonData.image_height,
						':last_updated': Math.round(amazonData.updated_at.getTime() / 1000),
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

	/**
	 * 商品を削除する
	 *
	 * @param {string} asin - ASIN
	 */
	async delete(asin: string): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			const sth = await dbh.prepare(`
				DELETE FROM
					d_amazon
				WHERE
					asin = :asin
			`);
			await sth.run({
				':asin': asin,
			});
			await sth.finalize();

			dbh.exec('COMMIT');
		} catch (e) {
			dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
