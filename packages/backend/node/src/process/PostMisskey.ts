import fs from 'node:fs';
import ejs from 'ejs';
import type { Misskey as Configure } from '../../../configure/type/misskey.js';

interface ConfigCommon {
	views: string;
}

/**
 * Misskey 投稿
 */
export default class PostMisskey {
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

		this.#config = JSON.parse(fs.readFileSync('configure/misskey.json', 'utf8'));

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
		const response = await fetch(`${this.#config.api.instance_origin}/api/notes/create`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				i: this.#config.api.access_token,
				text: await PostMisskey.#getMessage(`${this.#configCommon.views}/${this.#config.view_path}`, entryData),
				visibility: this.#env === 'development' ? 'specified' : this.#config.visibility,
			}), // https://misskey.io/api-doc#tag/notes
		});
		const responseJson = JSON.parse(await response.text());
		if (!response.ok) {
			throw new Error(responseJson.error.message);
		}

		const { createdNote } = responseJson;

		return {
			createdAt: createdNote.createdAt,
			url: `${this.#config.api.instance_origin}/notes/${String(createdNote.id)}`,
			content: createdNote.text,
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
