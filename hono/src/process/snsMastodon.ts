import ejs from 'ejs';
import Log4js from 'log4js';
import { createRestAPIClient as mastodonRest } from 'masto';
import { env } from '@w0s/env-value-type';
import configMastodon from '../config/mastodon.ts';
import type { Normal as ProcessResult } from '../../@types/process.d.ts';
import type { EntryData as SocialEntryData } from '../../@types/social.d.ts';

const logger = Log4js.getLogger('Mastodon');

/**
 * 投稿本文を組み立てる
 *
 * @param templatePath - テンプレートファイルのパス
 * @param entryData - 記事データ
 *
 * @returns 投稿本文
 */
const getMessage = async (templatePath: string, entryData: SocialEntryData): Promise<string> =>
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
 * @returns 処理結果
 */
const post = async (entryData: SocialEntryData): Promise<ProcessResult> => {
	try {
		const mastodon = mastodonRest({
			url: env('MASTODON_INSTANCE'),
			accessToken: env('MASTODON_ACCESS_TOKEN'),
		});

		const status = await mastodon.v1.statuses.create({
			status: await getMessage(`${env('VIEWS')}/${configMastodon.template}`, entryData),
			visibility: process.env['NODE_ENV'] === 'production' ? configMastodon.visibility : 'direct', // https://docs.joinmastodon.org/entities/Status/#visibility
			language: 'ja',
		});

		const url = status.url ?? status.uri;

		logger.info('Mastodon posted success', url);

		return { success: true, message: `${configMastodon.processMessage.success} ${url}` };
	} catch (e) {
		logger.error(e);

		return { success: false, message: configMastodon.processMessage.failure };
	}
};

export default post;
