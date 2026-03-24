import ejs from 'ejs';
import { env } from '@w0s/env-value-type';
import config from '../config/sns.ts';
import type { EntryData as SocialEntryData } from '../../@types/sns.d.ts';
import type { NotesCreate as MisskeyNotesCreate } from '../../../@types/misskey.d.ts';

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
 * Misskey 投稿
 *
 * @param entryData - 記事データ
 *
 * @returns 投稿 URL
 */
export const post = async (entryData: Readonly<SocialEntryData>): Promise<string> => {
	const response = await fetch(`${env('MISSKEY_INSTANCE')}/api/notes/create`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			i: env('MISSKEY_ACCESS_TOKEN'),
			text: await getMessage(`${env('ROOT')}/${env('TEMPLATE_DIR')}/${config.misskey.template}`, entryData),
			visibility: process.env['NODE_ENV'] === 'production' ? config.misskey.visibility : 'specified',
		}), // https://misskey.noellabo.jp/api-doc#tag/notes/POST/notes/create
	});
	const responseJson = JSON.parse(await response.text()) as MisskeyNotesCreate;
	if (!response.ok) {
		throw new Error(responseJson.error.message);
	}

	const { createdNote: postedStatus } = responseJson;

	return `${env('MISSKEY_INSTANCE')}/notes/${postedStatus.id}`;
};
