import { Dayjs } from 'dayjs';
import * as sqlite from 'sqlite';
import BlogDao from './BlogDao.js';
import DbUtil from '../util/DbUtil.js';

interface CategoryMaster {
	group_name: string;
	id: string;
	name: string;
}

interface ReviseData {
	id: number;
	title: string;
	description: string | null;
	message: string;
	category_ids: string[];
	image: string | null;
	image_external: string | null;
	relation_ids: string[];
	public: boolean;
}

/**
 * 記事投稿
 */
export default class BlogPostDao extends BlogDao {
	/**
	 * 最新記事 ID を取得
	 *
	 * @returns {number} 最新記事 ID （記事が1件も登録されていない場合は 0 ）
	 */
	async getLatestId(): Promise<number> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id
			FROM
				d_topic
			ORDER BY
				insert_date DESC
			LIMIT 1
		`);

		const row = await sth.get();
		await sth.finalize();

		if (row === undefined) {
			return 0;
		}

		return row.id;
	}

	/**
	 * 最終更新日時を記録する
	 */
	async updateModified(): Promise<void> {
		const dbh = await this.getDbh();

		await dbh.exec('BEGIN');
		try {
			/* いったんクリア */
			await dbh.run(`
				DELETE FROM
					d_info
			`);

			/* 現在日時を記録 */
			const insertSth = await dbh.prepare(`
				INSERT INTO d_info
					(modified)
				VALUES
					(:modified)
			`);
			await insertSth.run({
				':modified': DbUtil.dateToUnix(),
			});
			await insertSth.finalize();

			await dbh.exec('COMMIT');
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}

	/**
	 * カテゴリー情報を取得
	 *
	 * @returns {CategoryMaster[]} カテゴリー情報
	 */
	async getCategoryMaster(): Promise<CategoryMaster[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				cg.name AS group_name,
				c.id AS id,
				c.name AS name
			FROM
				m_category c,
				m_catgroup cg
			WHERE
				c.catgroup = cg.id
			ORDER BY
				cg.sort,
				c.sort
		`);

		const rows = await sth.all();
		await sth.finalize();

		const categories: CategoryMaster[] = [];
		for (const row of rows) {
			categories.push({
				group_name: row.group_name,
				id: row.id,
				name: row.name,
			});
		}

		return categories;
	}

	/**
	 * カテゴリーグループに紐付けられたファイル名リストを取得
	 *
	 * @returns {string[]} ファイル名
	 */
	async getCategoryGroupMasterFileName(): Promise<string[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				file_name
			FROM
				m_catgroup
			WHERE
				file_name IS NOT NULL
		`);

		const rows = await sth.all();
		await sth.finalize();

		const fileNames: string[] = [];
		for (const row of rows) {
			fileNames.push(row.file_name);
		}

		return fileNames;
	}

	/**
	 * 記事タイトル重複チェック
	 *
	 * @param {string} title - 記事タイトル
	 * @param {number} topicId - 記事 ID（記事修正時、自記事をチェック対象から除外するのに使用）
	 *
	 * @returns {boolean} 同一の記事タイトルがあれば true
	 */
	async isExistsTitle(title: string, topicId: number | null): Promise<boolean> {
		const dbh = await this.getDbh();

		if (topicId !== null) {
			const sth = await dbh.prepare(`
				SELECT
					COUNT() AS count
				FROM
					d_topic
				WHERE
					id != :id AND
					title = :title
			`);
			await sth.bind({
				':id': topicId,
				':title': title,
			});

			const row = await sth.get();
			await sth.finalize();

			return row !== undefined && row.count > 0;
		}

		const sth = await dbh.prepare(`
				SELECT
					COUNT() AS count
				FROM
					d_topic
				WHERE
					title = :title
				LIMIT 1
			`);
		await sth.bind({
			':title': title,
		});

		const row = await sth.get();
		await sth.finalize();

		return row !== undefined && row.count > 0;
	}

	/**
	 * 記事データを登録する
	 *
	 * @param {string} title - タイトル
	 * @param {string | null} description - 概要
	 * @param {string} message - 本文
	 * @param {string[]} categoryIds - カテゴリー ID
	 * @param {string | null} imagePath - 画像パス
	 * @param {number[]} relationIds - 関連記事 ID
	 * @param {boolean} publicFlag - 公開フラグ
	 *
	 * @returns {number | null} 登録した記事 ID
	 */
	async insert(
		title: string,
		description: string | null,
		message: string,
		categoryIds: string[],
		imagePath: string | null,
		relationIds: string[] | null,
		publicFlag: boolean
	): Promise<number> {
		const dbh = await this.getDbh();

		let imageInternal = null;
		let imageExternal = null;
		if (imagePath !== null) {
			try {
				new URL(imagePath); /* eslint-disable-line no-new */
				imageExternal = imagePath;
			} catch {
				imageInternal = imagePath;
			}
		}

		await dbh.exec('BEGIN');
		try {
			const topicInsertSth = await dbh.prepare(`
				INSERT INTO d_topic
					(title, description, message, image, image_external, insert_date, public)
				VALUES
					(:title, :description, :message, :image_internal, :image_external, :insert_date, :public)
			`);
			const topicInsertResult = await topicInsertSth.run({
				':title': title,
				':description': DbUtil.emptyToNull(description),
				':message': message,
				':image_internal': imageInternal,
				':image_external': imageExternal,
				':insert_date': DbUtil.dateToUnix(),
				':public': publicFlag,
			});
			await topicInsertSth.finalize();

			const topicId = topicInsertResult.lastID;
			if (topicId === undefined) {
				throw new Error('Failed to INSERT into `d_topic` table.');
			}

			if (categoryIds.length > 0) {
				const categoryInsertSth = await dbh.prepare(`
					INSERT INTO d_topic_category
						(topic_id, category_id)
					VALUES
						(:topic_id, :category_id)
				`);
				await Promise.all(
					categoryIds.map(async (categoryId) => {
						await categoryInsertSth.run({
							':topic_id': topicId,
							':category_id': categoryId,
						});
					})
				);
				await categoryInsertSth.finalize();
			}

			if (relationIds !== null && relationIds.length > 0) {
				const relationInsertSth = await dbh.prepare(`
					INSERT INTO d_topic_relation
						(topic_id, relation_id)
					VALUES
						(:topic_id, :relation_id)
				`);
				await Promise.all(
					relationIds.map(async (relationId) => {
						await relationInsertSth.run({
							':topic_id': topicId,
							':relation_id': relationId,
						});
					})
				);
				await relationInsertSth.finalize();
			}

			await dbh.exec('COMMIT');

			return topicId;
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}

	/**
	 * 記事データを修正する
	 *
	 * @param {number} topicId - 記事 ID
	 * @param {string} title - タイトル
	 * @param {string | null} description - 概要
	 * @param {string} message - 本文
	 * @param {string[]} categoryIds - カテゴリー ID
	 * @param {string | null} imagePath - 画像パス
	 * @param {number[] | null} relationIds - 関連記事 ID
	 * @param {boolean} publicFlag - 公開フラグ
	 * @param {boolean} timestampUpdate - 更新日時を変更する
	 */
	async update(
		topicId: number,
		title: string,
		description: string | null,
		message: string,
		categoryIds: string[],
		imagePath: string | null,
		relationIds: string[] | null,
		publicFlag: boolean,
		timestampUpdate: boolean
	): Promise<void> {
		const dbh = await this.getDbh();

		let imageInternal = null;
		let imageExternal = null;
		if (imagePath !== null) {
			try {
				new URL(imagePath); /* eslint-disable-line no-new */
				imageExternal = imagePath;
			} catch {
				imageInternal = imagePath;
			}
		}

		await dbh.exec('BEGIN');
		try {
			if (timestampUpdate) {
				const topicUpdateSth = await dbh.prepare(`
					UPDATE
						d_topic
					SET
						title = :title,
						description = :description,
						message = :message,
						image = :image_internal,
						image_external = :image_external,
						last_update = :last_update,
						public = :public
					WHERE
						id = :topic_id
				`);
				await topicUpdateSth.run({
					':title': title,
					':description': DbUtil.emptyToNull(description),
					':message': message,
					':image_internal': imageInternal,
					':image_external': imageExternal,
					':last_update': DbUtil.dateToUnix(),
					':public': publicFlag,
					':topic_id': topicId,
				});
				await topicUpdateSth.finalize();
			} else {
				const topicUpdateSth = await dbh.prepare(`
					UPDATE
						d_topic
					SET
						title = :title,
						description = :description,
						message = :message,
						image = :image_internal,
						image_external = :image_external,
						public = :public
					WHERE
						id = :topic_id
				`);
				await topicUpdateSth.run({
					':title': title,
					':description': DbUtil.emptyToNull(description),
					':message': message,
					':image_internal': imageInternal,
					':image_external': imageExternal,
					':public': publicFlag,
					':topic_id': topicId,
				});
				await topicUpdateSth.finalize();
			}

			const categoryDeleteSth = await dbh.prepare(`
				DELETE FROM
					d_topic_category
				WHERE
					topic_id = :topic_id
			`);
			await categoryDeleteSth.run({
				':topic_id': topicId,
			});
			await categoryDeleteSth.finalize();

			if (categoryIds.length > 0) {
				const categoryInsertSth = await dbh.prepare(`
					INSERT INTO d_topic_category
						(topic_id, category_id)
					VALUES
						(:topic_id, :category_id)
				`);
				await Promise.all(
					categoryIds.map(async (categoryId) => {
						await categoryInsertSth.run({
							':topic_id': topicId,
							':category_id': categoryId,
						});
					})
				);
				await categoryInsertSth.finalize();
			}

			const relationDeleteSth = await dbh.prepare(`
				DELETE FROM
					d_topic_relation
				WHERE
					topic_id = :topic_id
			`);
			await relationDeleteSth.run({
				':topic_id': topicId,
			});
			await relationDeleteSth.finalize();

			if (relationIds !== null && relationIds.length > 0) {
				const relationInsertSth = await dbh.prepare(`
					INSERT INTO d_topic_relation
						(topic_id, relation_id)
					VALUES
						(:topic_id, :relation_id)
				`);
				await Promise.all(
					relationIds.map(async (relationId) => {
						await relationInsertSth.run({
							':topic_id': topicId,
							':relation_id': relationId,
						});
					})
				);
				await relationInsertSth.finalize();
			}

			await dbh.exec('COMMIT');
		} catch (e) {
			await dbh.exec('ROLLBACK');
			throw e;
		}
	}

	/**
	 * 修正する記事データを取得する
	 *
	 * @param {number} id - 記事 ID
	 *
	 * @returns {ReviseData} 記事データ
	 */
	async getReviseData(id: number): Promise<ReviseData | null> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				t.title,
				t.description,
				t.message,
				(SELECT group_concat(tc.category_id, " ") FROM d_topic_category tc WHERE t.id = tc.topic_id ORDER BY tc.category_id) AS category_ids,
				t.image,
				t.image_external,
				(SELECT group_concat(tr.relation_id, " ") FROM d_topic_relation tr WHERE t.id = tr.topic_id) AS relation_ids,
				t.public
			FROM
				d_topic t
			WHERE
				t.id = :id
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
			title: row.title,
			description: row.description,
			message: row.message,
			category_ids: row.category_ids !== null ? row.category_ids.split(' ') : [],
			image: row.image,
			image_external: row.image_external,
			relation_ids: row.relation_ids !== null ? row.relation_ids.split(' ') : [],
			public: Boolean(row.public),
		};
	}

	/**
	 * フィード用の記事データを取得する
	 *
	 * @param {number} limit - 最大取得件数
	 *
	 * @returns {Array} 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntriesFeed(limit: number): Promise<BlogDb.Entry[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id,
				title,
				description,
				message,
				image AS image_internal,
				image_external,
				insert_date AS created_at,
				last_update AS updated_at,
				public
			FROM
				d_topic
			WHERE
				public = :public
			ORDER BY
				CASE
					WHEN last_update IS NULL THEN insert_date
					ELSE last_update
				END DESC
			LIMIT :limit
		`);
		await sth.bind({
			':public': true,
			':limit': limit,
		});
		const rows = await sth.all();
		await sth.finalize();

		const entries: BlogDb.Entry[] = [];
		for (const row of rows) {
			entries.push({
				id: row.id,
				title: row.title,
				description: row.description,
				message: row.message,
				image_internal: row.image_internal,
				image_external: row.image_external,
				created_at: <Date>DbUtil.unixToDate(row.created_at),
				updated_at: DbUtil.unixToDate(row.updated_at),
				public: Boolean(row.public),
			});
		}

		return entries;
	}

	/**
	 * 新着記事データを取得する
	 *
	 * @param {number} limit - 最大取得件数
	 *
	 * @returns {object[]} 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntriesSitemap(limit: number): Promise<BlogView.SitemapEntry[]> {
		const dbh = await this.getDbh();

		const sth = await dbh.prepare(`
			SELECT
				id,
				insert_date AS created_at,
				last_update AS updated_at
			FROM
				d_topic
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

		const rows = await sth.all();
		await sth.finalize();

		const entries: BlogView.SitemapEntry[] = [];
		for (const row of rows) {
			entries.push({
				id: row.id,
				updated_at: <Dayjs>DbUtil.unixToDayjs(row.updated_at ?? row.created_at),
			});
		}

		return entries;
	}

	/**
	 * 新着記事データを取得する
	 *
	 * @param {number} limit - 最大取得件数
	 * @param {string} catgroupId - カテゴリグループの ID
	 *
	 * @returns {object[]} 記事データ（該当する記事が存在しない場合は空配列）
	 */
	async getEntriesNewly(limit: number, catgroupId?: string): Promise<BlogView.NewlyEntry[]> {
		const dbh = await this.getDbh();

		let sth: sqlite.Statement;
		if (catgroupId === undefined) {
			sth = await dbh.prepare(`
				SELECT
					id,
					title
				FROM
					d_topic
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
					t.id AS id,
					t.title AS title
				FROM
					d_topic t,
					d_topic_category tc,
					m_category c,
					m_catgroup cg
				WHERE
					t.public = :public AND
					t.id = tc.topic_id AND
					tc.category_id = c.id AND
					c.catgroup = cg.id AND
					cg.file_name = :catgroup_id
				GROUP BY
					t.id
				ORDER BY
					t.id DESC
				LIMIT :limit
			`);
			await sth.bind({
				':public': true,
				':catgroup_id': catgroupId,
				':limit': limit,
			});
		}
		const rows = await sth.all();
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
