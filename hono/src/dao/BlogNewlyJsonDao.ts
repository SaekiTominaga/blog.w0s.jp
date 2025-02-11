import type * as sqlite from 'sqlite';
import BlogDao from './BlogDao.js';

/**
 * 新着 JSON ファイル
 */
export default class BlogNewlyJsonDao extends BlogDao {
	/**
	 * カテゴリーグループに紐付けられたファイル名リストを取得
	 *
	 * @returns ファイル名
	 */
	async getCategoryGroupMasterFileName(): Promise<string[]> {
		interface Select {
			file_name: string;
		}

		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				file_name
			FROM
				m_catgroup
			WHERE
				file_name IS NOT NULL
		`);

		const rows: Select[] = await sth.all();
		await sth.finalize();

		const fileNames: string[] = [];
		for (const row of rows) {
			fileNames.push(row.file_name);
		}

		return fileNames;
	}

	/**
	 * 新着記事データを取得する
	 *
	 * @param limit - 最大取得件数
	 * @param catgroupId - カテゴリグループの ID
	 *
	 * @returns 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntries(limit: number, catgroupId?: string): Promise<BlogView.NewlyEntry[]> {
		interface Select {
			id: number;
			title: string;
		}

		const dbh = await this.getDbh();

		let sth: sqlite.Statement;
		if (catgroupId === undefined) {
			sth = await dbh.prepare(`
				SELECT
					id,
					title
				FROM
					d_entry
				WHERE
					public = :public
				ORDER BY
					id DESC
				LIMIT :limit
			`);
			await sth.bind({
				':public': true,
				':limit': limit,
			});
		} else {
			sth = await dbh.prepare(`
				SELECT
					e.id AS id,
					e.title AS title
				FROM
					d_entry e,
					d_entry_category ec,
					m_category c,
					m_catgroup cg
				WHERE
					e.public = :public AND
					e.id = ec.entry_id AND
					ec.category_id = c.id AND
					c.catgroup = cg.id AND
					cg.file_name = :catgroup_id
				GROUP BY
					e.id
				ORDER BY
					e.id DESC
				LIMIT :limit
			`);
			await sth.bind({
				':public': true,
				':catgroup_id': catgroupId,
				':limit': limit,
			});
		}
		const rows: Select[] = await sth.all();
		await sth.finalize();

		const entries: BlogView.NewlyEntry[] = [];
		for (const row of rows) {
			entries.push({
				id: row.id,
				title: row.title,
			});
		}

		return entries;
	}
}
