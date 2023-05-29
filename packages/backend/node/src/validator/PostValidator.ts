import { body, Result, ValidationError, validationResult } from 'express-validator';
import { Request } from 'express';
import BlogPostDao from '../dao/BlogPostDao.js';
import { NoName as Configure } from '../../../configure/type/post.js';

/**
 * 記事投稿
 */
export default class PostValidator {
	#req: Request;

	#config: Configure;

	/**
	 * @param {Request} req - Request
	 * @param {Configure} config - 設定ファイル
	 */
	constructor(req: Request, config: Configure) {
		this.#req = req;
		this.#config = config;
	}

	/**
	 * 記事投稿
	 *
	 * @param {BlogPostDao} dao - Dao
	 * @param {number} topicId - 記事 ID
	 *
	 * @returns {Result<ValidationError>} 検証エラー
	 */
	async topic(dao: BlogPostDao, topicId: number | null = null): Promise<Result<ValidationError>> {
		await body('title')
			.custom(
				async (value: string): Promise<boolean> => {
					if (await dao.isExistsTitle(value, topicId)) {
						return Promise.reject();
					}
					return true;
				}
			)
			.withMessage(this.#config.validator.title.message['unique_constraint'])
			.run(this.#req);

		return validationResult(this.#req);
	}
}
