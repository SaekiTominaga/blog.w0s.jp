import BlogDao from './BlogDao.js';

interface Entry {
	id: number;
	title: string;
	image_internal: string | null;
	image_external: string | null;
	insert_date: Date;
	last_update?: Date | null;
}

/**
 * 日記タイトル一覧
 */
export default class BlogCategoryDao extends BlogDao {
	/**
	 * 記事データを取得する
	 *
	 * @param {string} categoryName - カテゴリ名
	 *
	 * @returns {Array} 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(categoryName: string): Promise<Entry[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
				SELECT
					t.id AS id,
					t.title AS title,
					t.image AS image_internal,
					t.image_external AS image_external,
					t.insert_date AS insert_date,
					t.last_update AS last_update
				FROM
					m_category c,
					d_topic_category tc,
					d_topic t
				WHERE
					c.name = :name AND
					c.id = tc.category_id AND
					tc.topic_id = t.id AND
					t.public = :public
				ORDER BY
					t.insert_date DESC
		`);
		await sth.bind({
			':name': categoryName,
			':public': true,
		});
		const rows = await sth.all();
		await sth.finalize();

		const entries: Entry[] = [];
		for (const row of rows) {
			entries.push({
				id: Number(row.id),
				title: row.title,
				image_internal: row.image_internal,
				image_external: row.image_external,
				insert_date: new Date(Number(row.insert_date) * 1000),
				last_update: row.last_update !== null ? new Date(Number(row.last_update) * 1000) : null,
			});
		}

		return entries;
	}
}
