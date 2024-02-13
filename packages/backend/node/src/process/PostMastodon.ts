import fs from 'node:fs';
import ejs from 'ejs';
import { createRestAPIClient as mastodonRest } from 'masto';
import type { Mastodon as Configure } from '../../../configure/type/mastodon.js';

/**
 * Mastodon 投稿
 */
export default class CreateNewlyJson {
	#config: Configure;

	#env: Express.Env;

	/**
	 * @param env - NODE_ENV
	 */
	constructor(env: Express.Env) {
		this.#config = JSON.parse(fs.readFileSync('configure/mastodon.json', 'utf8'));

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
		const mastodon = mastodonRest({
			url: this.#config.api.instance_origin,
			accessToken: this.#config.api.access_token,
		});

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

		const status = await mastodon.v1.statuses.create({
			status: message,
			visibility: this.#env === 'development' ? 'direct' : this.#config.visibility, // https://docs.joinmastodon.org/entities/Status/#visibility
			language: 'ja',
		});

		return {
			url: status.url ?? status.uri,
		};
	}
}
