import ejs from 'ejs';
import { createRestAPIClient as mastodonRest } from 'masto';
import { env } from '@w0s/env-value-type';
import config from '../config/sns.ts';
import type { EntryData as SocialEntryData } from '../../@types/sns.d.ts';

/**
 * 投稿本文を組み立てる
 *
 * @param templatePath - テンプレートファイルのパス
 * @param entryData - 記事データ
 *
 * @returns 投稿本文
 */
const getMessage = async (templatePath: string, entryData: Readonly<SocialEntryData>): Promise<string> =>
	(
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

/**
 * Mastodon 投稿
 *
 * @param entryData - 記事データ
 *
 * @returns 投稿 URL
 */
export const post = async (entryData: Readonly<SocialEntryData>): Promise<string> => {
	const mastodon = mastodonRest({
		url: env('MASTODON_INSTANCE'),
		accessToken: env('MASTODON_ACCESS_TOKEN'),
	});

	const postedStatus = await mastodon.v1.statuses.create({
		status: await getMessage(`${env('ROOT')}/${env('TEMPLATE_DIR')}/${config.mastodon.template}`, entryData),
		visibility: process.env['NODE_ENV'] === 'production' ? config.mastodon.visibility : 'direct', // https://docs.joinmastodon.org/entities/Status/#visibility
		language: 'ja',
	});

	return postedStatus.url ?? postedStatus.uri;
};
