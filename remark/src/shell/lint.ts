import { parseArgs } from 'node:util';
import { env } from '@w0s/env-value-type';
import Markdown from '../Markdown.ts';
import BlogEntryMessageDao from '../dao/BlogEntryMessageDao.ts';

/**
 * Markdown の構文チェック
 */

const argsParsedValues = parseArgs({
	options: {
		id: {
			type: 'string',
		},
	},
}).values;

const dao = new BlogEntryMessageDao(env('SQLITE_BLOG'));

const entryId = argsParsedValues.id !== undefined ? Number(argsParsedValues.id) : undefined;

/* DB からデータ取得 */
const entryiesMessageDto = await dao.getEntriesMessage(entryId);

const markdown = new Markdown({
	lint: true,
});

const promised = [...entryiesMessageDto].map(async ([id, message]) => {
	const { messages: vMessages } = await markdown.toHtml(message);

	if (vMessages.length >= 1) {
		vMessages.forEach((vMessage) => {
			const { reason, line, column, ruleId } = vMessage;

			console.warn(id, `${String(line)}:${String(column)} ${reason} <${String(ruleId)}>`);
		});
	}
});
await Promise.all(promised);
