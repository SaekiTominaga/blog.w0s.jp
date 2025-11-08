import { parseArgs } from 'node:util';
import { env } from '@w0s/env-value-type';
// eslint-disable-next-line import/extensions
import Markdown from '@blog.w0s.jp/remark/dist/Markdown.js';
import BlogEntryMessageConvertDao from '../dao/BlogEntryMessageConvertDao.ts';

/**
 * 記事本文の構文チェック
 */

const argsParsedValues = parseArgs({
	options: {
		id: {
			type: 'string',
		},
	},
}).values;

const dao = new BlogEntryMessageConvertDao(env('SQLITE_BLOG'));

const entryId = argsParsedValues.id !== undefined ? Number(argsParsedValues.id) : undefined;

/* DB からデータ取得 */
const entryiesMessageDto = await dao.getEntriesMessage(entryId);

const markdown = new Markdown({
	lint: true,
});

for (const [id, message] of [...entryiesMessageDto]) {
	const { messages: vMessages } = await markdown.toHtml(message);

	if (vMessages.length >= 1) {
		vMessages.forEach((vMessage) => {
			const { reason, line, column, ruleId } = vMessage;

			console.warn(id, `${String(line)}:${String(column)} ${reason} <${String(ruleId)}>`);
		});
	}
}
