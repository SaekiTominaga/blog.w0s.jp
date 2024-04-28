import fs from 'node:fs';
import ejs from 'ejs';
import { createRestAPIClient as mastodonRest } from 'masto';
import type { Mastodon as Configure } from '../../../configure/type/mastodon.js';

interface ConfigCommon {
	views: string;
}

/**
 * Mastodon 投稿
 */
export default class PostMastodon {
	readonly #configCommon: ConfigCommon; // 共通設定の抜き出し

	readonly #config: Configure; // 機能設定

	readonly #env: Express.Env;

	/**
	 * @param configCommon 共通設定ファイル
	 * @param configCommon.views テンプレートディレクトリ
	 * @param env - NODE_ENV
	 */
	constructor(configCommon: ConfigCommon, env: Express.Env) {
		this.#configCommon = configCommon;

		this.#config = JSON.parse(fs.readFileSync('configure/mastodon.json', 'utf8'));

		this.#env = env;
	}

	/**
	 * @param entryData - 記事データ
	 *
	 * @returns ファイル生成情報
	 */
	async execute(entryData: BlogSocial.EntryData): Promise<{
		createdAt: string;
		url: string;
		content: string;
	}> {
		const mastodon = mastodonRest({
			url: this.#config.api.instance_origin,
			accessToken: this.#config.api.access_token,
		});

		const status = await mastodon.v1.statuses.create({
			status: await PostMastodon.#getMessage(`${this.#configCommon.views}/${this.#config.view_path}`, entryData),
			visibility: this.#env === 'development' ? 'direct' : this.#config.visibility, // https://docs.joinmastodon.org/entities/Status/#visibility
			language: 'ja',
		});

		return {
			createdAt: status.createdAt,
			url: status.url ?? status.uri,
			content: status.content,
		};
	}

	/**
	 * 投稿本文を組み立てる
	 *
	 * @param templatePath - テンプレートファイルのパス
	 * @param entryData - 記事データ
	 *
	 * @returns 投稿本文
	 */
	static async #getMessage(templatePath: string, entryData: BlogSocial.EntryData): Promise<string> {
		return (
			await ejs.renderFile(templatePath, {
				title: entryData.title,
				url: entryData.url,
				tags: entryData.tags?.map((tag) => {
					const tagTrimmed = tag.trim();
					if (tagTrimmed === '') {
						return '';
					}
					return `#${tagTrimmed}`;
				}),
				description: entryData.description,
			})
		).trim();
	}
}
