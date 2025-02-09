import { AtpAgent, RichText } from '@atproto/api';
import ejs from 'ejs';
import Log4js from 'log4js';
import configBluesky from '../config/bluesky.js';
import { env } from '../util/env.js';

const logger = Log4js.getLogger('Bluesky');

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
 * @returns 処理結果
 */
const post = async (entryData: Readonly<BlogSocial.EntryData>): Promise<Process.Result> => {
	try {
		const agent = new AtpAgent({
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

		await agent.post({
			text: richText.text,
			facets: richText.facets ?? [],
			langs: ['ja'],
		});

		logger.info('Bluesky posted success');

		return { success: true, message: `${configBluesky.processMessage.success} https://bsky.app/profile/${env('BLUESKY_HANDLE')}` };
	} catch (e) {
		logger.error(e);

		return { success: false, message: configBluesky.processMessage.failure };
	}
};

export default post;
