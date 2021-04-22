import BlogDao from './BlogDao.js';

interface AmazonData {
	asin: string;
	image_url: string;
}

/**
 * Amazon
 */
export default class BlogAmazonDao extends BlogDao {
	/**
	 * 画像が登録されている商品情報を取得する
	 *
	 * @returns {Array} 画像が登録されている商品情報
	 */
	async getWithImage(): Promise<AmazonData[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				asin,
				image_url
			FROM
				d_amazon
			WHERE
				image_url IS NOT NULL
		`);
		const rows = await sth.all();
		await sth.finalize();

		const amazonDataList: AmazonData[] = [];
		for (const row of rows) {
			amazonDataList.push({
				asin: row.asin,
				image_url: row.image_url,
			});
		}

		return amazonDataList;
	}

	/**
	 * 画像が登録されている商品情報を取得する
	 *
	 * @param {Array} amazonDataList - 画像が登録されている商品情報
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
			for (const amazonData of amazonDataList) {
				await sth.run({
					':asin': amazonData.asin,
					':url': amazonData.url,
					':title': amazonData.title,
					':binding': amazonData.binding,
					':product_group': amazonData.product_group,
					':date': amazonData.date !== null ? Math.round(amazonData.date.getTime() / 1000) : null,
					':image_url': amazonData.image_url,
					':image_width': amazonData.image_width,
					':image_height': amazonData.image_height,
					':last_updated': Math.round(amazonData.last_update.getTime() / 1000),
				});
			}
			await sth.finalize();
			dbh.exec('COMMIT');
		} catch (e) {
			dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
