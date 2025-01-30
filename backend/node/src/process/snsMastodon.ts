import ejs from 'ejs';
import { createRestAPIClient as mastodonRest } from 'masto';
import configMastodon from '../config/mastodon.js';
import { env } from '../util/env.js';

/**
 * 投稿本文を組み立てる
 *
 * @param templatePath - テンプレートファイルのパス
 * @param entryData - 記事データ
 *
 * @returns 投稿本文
 */
const getMessage = async (templatePath: string, entryData: Readonly<BlogSocial.EntryData>): Promise<string> =>
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
 * @returns 投稿情報
 */
const post = async (
	entryData: Readonly<BlogSocial.EntryData>,
): Promise<{
	createdAt: string;
	url: string;
	content: string;
}> => {
	const mastodon = mastodonRest({
		url: env('MASTODON_INSTANCE'),
		accessToken: env('MASTODON_ACCESS_TOKEN'),
	});

	const status = await mastodon.v1.statuses.create({
		status: await getMessage(`${env('VIEWS')}/${configMastodon.template}`, entryData),
		visibility: process.env['NODE_ENV'] === 'production' ? configMastodon.visibility : 'direct', // https://docs.joinmastodon.org/entities/Status/#visibility
		language: 'ja',
	});

	return {
		createdAt: status.createdAt,
		url: status.url ?? status.uri,
		content: status.content,
	};
};

export default post;
