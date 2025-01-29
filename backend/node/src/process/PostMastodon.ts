import fs from 'node:fs';
import ejs from 'ejs';
import { createRestAPIClient as mastodonRest } from 'masto';
import { env } from '../util/env.js';
import type { Mastodon as Configure } from '../../../configure/type/mastodon.js';

/**
 * Mastodon 投稿
 */
export default class PostMastodon {
	readonly #config: Configure; // 機能設定

	constructor() {
		this.#config = JSON.parse(fs.readFileSync('configure/mastodon.json', 'utf8')) as Configure;
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
			status: await PostMastodon.#getMessage(`${env('VIEWS')}/${this.#config.view_path}`, entryData),
			visibility: env('MASTODON_VISIBILITY') as 'public' | 'unlisted' | 'private' | 'direct', // https://docs.joinmastodon.org/entities/Status/#visibility
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
