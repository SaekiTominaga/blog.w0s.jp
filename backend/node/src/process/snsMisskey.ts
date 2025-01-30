import ejs from 'ejs';
import configMisskey from '../config/misskey.js';
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
 * Misskey 投稿
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
	const response = await fetch(`${env('MISSKEY_INSTANCE')}/api/notes/create`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			i: env('MISSKEY_ACCESS_TOKEN'),
			text: await getMessage(`${env('VIEWS')}/${configMisskey.template}`, entryData),
			visibility: process.env['NODE_ENV'] === 'production' ? configMisskey.visibility : 'specified',
		}), // https://misskey.noellabo.jp/api-doc#tag/notes/POST/notes/create
	});
	const responseJson = JSON.parse(await response.text()) as MisskryAPIResponse.NotesCreate;
	if (!response.ok) {
		throw new Error(responseJson.error.message);
	}

	const { createdNote } = responseJson;

	return {
		createdAt: createdNote.createdAt,
		url: `${env('MISSKEY_INSTANCE')}/notes/${String(createdNote.id)}`,
		content: createdNote.text,
	};
};

export default post;
