import BlogDao from './BlogDao.js';

interface Entry {
	id: number;
	title: string;
	image_internal: string | null;
	image_external: string | null;
	created: Date;
	last_updated?: Date | null;
}

/**
 * 日記タイトル一覧
 */
export default class BlogListDao extends BlogDao {
	/**
	 * 記事データを取得する
	 *
	 * @param page - ページ番号
	 * @param limit - 1ページあたりの最大表示件数
	 *
	 * @returns 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(page: number, limit: number): Promise<Entry[]> {
		interface Select {
			id: number;
			title: string;
			image_internal: string | null;
			image_external: string | null;
			created: number;
			last_updated: number | null;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id,
				title,
				image AS image_internal,
				image_external,
				insert_date AS created,
				last_update AS last_updated
			FROM
				d_topic
			WHERE
				public = :public
			ORDER BY
				insert_date DESC
			LIMIT :limit
			OFFSET :offset
		`);
		await sth.bind({
			':public': true,
			':limit': limit,
			':offset': (page - 1) * limit,
		});
		const rows: Select[] = await sth.all();
		await sth.finalize();

		const entries: Entry[] = [];
		for (const row of rows) {
			entries.push({
				id: Number(row.id),
				title: row.title,
				image_internal: row.image_internal,
				image_external: row.image_external,
				created: new Date(row.created * 1000),
				last_updated: row.last_updated !== null ? new Date(row.last_updated * 1000) : null,
			});
		}

		return entries;
	}
}
