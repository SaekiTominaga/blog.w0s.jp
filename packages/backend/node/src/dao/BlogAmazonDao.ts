import BlogDao from './BlogDao.js';

/**
 * Amazon
 */
export default class BlogAmazonDao extends BlogDao {
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
			await dbh.exec('COMMIT');
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}
}
