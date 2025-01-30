import { BskyAgent, RichText } from '@atproto/api';
import ejs from 'ejs';
import configBluesky from '../config/bluesky.js';
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
 * Bluesky 投稿
 *
 * @param entryData - 記事データ
 *
 * @returns 投稿情報
 */
const post = async (
	entryData: Readonly<BlogSocial.EntryData>,
): Promise<{
	uri: string;
	cid: string;
	profileUrl: string;
}> => {
	const agent = new BskyAgent({
		service: env('BLUESKY_INSTANCE'),
	});
	await agent.login({
		identifier: env('BLUESKY_ID'),
		password: env('BLUESKY_PASSWORD'),
	});

	const richText = new RichText({
		text: await getMessage(`${env('VIEWS')}/${configBluesky.template}`, entryData),
	});
	await richText.detectFacets(agent);

	const response = await agent.post({
		text: richText.text,
		facets: richText.facets ?? [],
		langs: ['ja'],
		createdAt: new Date().toISOString(),
	});

	return {
		uri: response.uri,
		cid: response.cid,
		profileUrl: `https://bsky.app/profile/${env('BLUESKY_HANDLE')}`,
	};
};

export default post;
