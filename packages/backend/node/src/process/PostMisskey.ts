import fs from 'node:fs';
import ejs from 'ejs';
import type { Misskey as Configure } from '../../../configure/type/misskey.js';

/**
 * Misskey 投稿
 */
export default class PostMisskey {
	#config: Configure;

	#env: Express.Env;

	/**
	 * @param env - NODE_ENV
	 */
	constructor(env: Express.Env) {
		this.#config = JSON.parse(fs.readFileSync('configure/misskey.json', 'utf8'));

		this.#env = env;
	}

	/**
	 * @param configCommon 共通設定ファイル
	 * @param configCommon.views テンプレートディレクトリ
	 * @param requestQuery - URL クエリー情報
	 * @param entryUrl - 記事 URL
	 *
	 * @returns ファイル生成情報
	 */
	async execute(
		configCommon: { views: string },
		requestQuery: BlogRequest.Post,
		entryUrl: string,
	): Promise<{
		url: string;
	}> {
		const message = (
			await ejs.renderFile(`${configCommon.views}/${this.#config.view_path}`, {
				title: requestQuery.title,
				url: entryUrl,
				tags: requestQuery.social_tag?.split(',').map((tag) => {
					const tagTrimmed = tag.trim();
					if (tagTrimmed === '') {
						return '';
					}
					return `#${tagTrimmed}`;
				}),
				description: requestQuery.description,
			})
		).trim();

		const response = await fetch(`${this.#config.api.instance_origin}/api/notes/create`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				i: this.#config.api.access_token,
				text: message,
				visibility: this.#env === 'development' ? 'specified' : this.#config.visibility,
			}), // https://misskey.io/api-doc#tag/notes
		});
		const responseJson = JSON.parse(await response.text());
		if (!response.ok) {
			throw new Error(responseJson.error.message);
		}

		return {
			url: `${this.#config.api.instance_origin}/notes/${responseJson.createdNote.id}`,
		};
	}
}
