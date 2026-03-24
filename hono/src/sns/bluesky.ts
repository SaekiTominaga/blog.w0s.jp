import { AtpAgent, RichText } from '@atproto/api';
import ejs from 'ejs';
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
 * Bluesky 投稿
 *
 * @param entryData - 記事データ
 *
 * @returns 投稿 URI
 */
export const post = async (entryData: Readonly<SocialEntryData>): Promise<string> => {
	const agent = new AtpAgent({
		service: env('BLUESKY_INSTANCE'),
	});
	await agent.login({
		identifier: env('BLUESKY_ID'),
		password: env('BLUESKY_PASSWORD'),
	});

	const richText = new RichText({
		text: await getMessage(`${env('ROOT')}/${env('TEMPLATE_DIR')}/${config.bluesky.template}`, entryData),
	});
	await richText.detectFacets(agent);

	const postedStatus = await agent.post({
		text: richText.text,
		facets: richText.facets ?? [],
		langs: ['ja'],
	});

	return postedStatus.uri;
};
