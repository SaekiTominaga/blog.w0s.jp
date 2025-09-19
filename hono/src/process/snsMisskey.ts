import ejs from 'ejs';
import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
import configMisskey from '../config/misskey.ts';

const logger = Log4js.getLogger('Misskey');

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
 * @returns 処理結果
 */
const post = async (entryData: Readonly<BlogSocial.EntryData>): Promise<Process.Result> => {
	try {
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

		const url = `${env('MISSKEY_INSTANCE')}/notes/${createdNote.id}`;

		logger.info('Misskey posted success', url);

		return { success: true, message: `${configMisskey.processMessage.success} ${url}` };
	} catch (e) {
		logger.error(e);

		return { success: false, message: configMisskey.processMessage.failure };
	}
};

export default post;
