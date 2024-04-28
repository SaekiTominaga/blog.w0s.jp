import fs from 'node:fs';
import { BskyAgent, RichText } from '@atproto/api';
import ejs from 'ejs';
import type { Bluesky as Configure } from '../../../configure/type/bluesky.js';

interface ConfigCommon {
	views: string;
}

/**
 * Bluesky 投稿
 */
export default class PostBluesky {
	readonly #configCommon: ConfigCommon; // 共通設定の抜き出し

	readonly #config: Configure; // 機能設定

	/**
	 * @param configCommon 共通設定ファイル
	 * @param configCommon.views テンプレートディレクトリ
	 */
	constructor(configCommon: ConfigCommon) {
		this.#configCommon = configCommon;

		this.#config = JSON.parse(fs.readFileSync('configure/bluesky.json', 'utf8'));
	}

	/**
	 * @param entryData - 記事データ
	 *
	 * @returns ファイル生成情報
	 */
	async execute(entryData: BlogSocial.EntryData): Promise<{
		uri: string;
		cid: string;
		profile_url: string;
	}> {
		const agent = new BskyAgent({
			service: this.#config.api.instance_origin,
		});
		await agent.login({
			identifier: this.#config.api.id,
			password: this.#config.api.password,
		});

		const richText = new RichText({
			text: await PostBluesky.#getMessage(`${this.#configCommon.views}/${this.#config.view_path}`, entryData),
		});
		await richText.detectFacets(agent);

		const response = await agent.post({
			text: richText.text,
			facets: richText.facets!,
			langs: ['ja'],
			createdAt: new Date().toISOString(),
		});

		return {
			uri: response.uri,
			cid: response.cid,
			profile_url: `https://bsky.app/profile/${String(this.#config.api.handle)}`,
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
