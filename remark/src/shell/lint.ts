import { parseArgs } from 'node:util';
import { env } from '@w0s/env-value-type';
import Markdown from '../Markdown.ts';
import Dao from '../db/Entry.ts';

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

const entryId = argsParsedValues.id !== undefined ? Number(argsParsedValues.id) : undefined;

/* DB からデータ取得 */
const dao = new Dao(env('SQLITE_BLOG'), {
	readonly: false,
});

const entryiesDto = await dao.findMessage(entryId);

const markdown = new Markdown({
	lint: true,
});

const promised = entryiesDto.map(async ({ id, message }) => {
	const { messages: vMessages } = await markdown.toHtml(message);

	if (vMessages.length >= 1) {
		vMessages.forEach((vMessage) => {
			const { reason, line, column, ruleId } = vMessage;

			console.warn(id, `${String(line)}:${String(column)} ${reason} <${String(ruleId)}>`);
		});
	}
});
await Promise.all(promised);
