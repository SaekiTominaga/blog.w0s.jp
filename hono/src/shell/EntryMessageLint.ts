import { parseArgs } from 'node:util';
import { env } from '@w0s/env-value-type';
import BlogEntryMessageConvertDao from '../dao/BlogEntryMessageConvertDao.ts';
import Markdown from '../markdown/Markdown.ts';

/**
 * 記事本文の構文チェック
 */

const argsParsedValues = parseArgs({
	options: {
		id: {
			type: 'string',
		},
		dbupdate: {
			type: 'boolean',
			default: false,
		},
	},
}).values;

const dao = new BlogEntryMessageConvertDao(env('SQLITE_BLOG'));

const entryId = argsParsedValues.id !== undefined ? Number(argsParsedValues.id) : undefined;

/* DB からデータ取得 */
const entryiesMessageDto = await dao.getEntriesMessage(entryId);

for (const [id, message] of [...entryiesMessageDto]) {
	const markdown = new Markdown({
		lint: true,
	});
	const { messages: vMessages } = await markdown.toHtml(message);

	if (vMessages.length >= 1) {
		vMessages.forEach((vMessage) => {
			const { reason, line, column, ruleId } = vMessage;

			console.warn(id, `${String(line)}:${String(column)} ${reason} <${String(ruleId)}>`);
		});
	}
}
