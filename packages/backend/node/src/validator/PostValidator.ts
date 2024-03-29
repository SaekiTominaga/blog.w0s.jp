import { body, type Result, type ValidationError, validationResult } from 'express-validator';
import type { Request } from 'express';
import BlogPostDao from '../dao/BlogPostDao.js';
import type { NoName as Configure } from '../../../configure/type/post.js';

/**
 * 記事投稿
 */
export default class PostValidator {
	#req: Request;

	#config: Configure;

	/**
	 * @param req - Request
	 * @param config - 設定ファイル
	 */
	constructor(req: Request, config: Configure) {
		this.#req = req;
		this.#config = config;
	}

	/**
	 * 記事投稿
	 *
	 * @param dao - Dao
	 * @param topicId - 記事 ID
	 *
	 * @returns 検証エラー
	 */
	async topic(dao: BlogPostDao, topicId: number | null = null): Promise<Result<ValidationError>> {
		await body('title')
			.custom(async (value: string): Promise<boolean> => {
				if (await dao.isExistsTitle(value, topicId)) {
					return Promise.reject(new Error());
				}
				return true;
			})
			.withMessage(this.#config.validator.title.message.unique_constraint)
			.run(this.#req);

		return validationResult(this.#req);
	}
}
