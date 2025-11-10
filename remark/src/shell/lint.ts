import { parseArgs } from 'node:util';
import Markdown from '../Markdown.ts';
import { findMessage as findEntry } from '../db/table/entry.ts';

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
const entryiesDto = await findEntry(entryId);

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
