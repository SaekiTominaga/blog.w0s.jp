import type { Request } from 'express';
import { body, type Result, type ValidationError, validationResult } from 'express-validator';
import config from '../config/post.js';
import BlogPostDao from '../dao/BlogPostDao.js';

/**
 * 記事投稿
 */
export default class PostValidator {
	readonly #req: Request;

	/**
	 * @param req - Request
	 */
	constructor(req: Request) {
		this.#req = req;
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
			.withMessage(config.validator.title.message.unique)
			.run(this.#req);

		return validationResult(this.#req);
	}
}
