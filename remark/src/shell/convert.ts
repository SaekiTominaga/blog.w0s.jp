import { parseArgs } from 'node:util';
import { env } from '@w0s/env-value-type';
import BlogEntryMessageDao from '../dao/BlogEntryMessageDao.ts';
import { from, to } from './config/convert.ts';

/**
 * Markdown の構文書き換え
 */

const argsParsedValues = parseArgs({
	options: {
		id: {
			type: 'string',
		},
		update: {
			type: 'boolean',
			default: false,
		},
	},
}).values;

const convert = (entryId: number, message: string): string => {
	const CRLF = '\r\n';
	const LF = '\n';

	let exec = false;

	const lines = message.replaceAll(new RegExp(`${CRLF}|${LF}`, 'gv'), CRLF).split(CRLF);
	const newLines = lines.map((line, index): string => {
		if (!from.test(line)) {
			return line;
		}

		exec = true;

		const convertd = line.replaceAll(from, to);
		console.info(entryId, index, `${line} → ${convertd}`);

		return convertd;
	});

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!exec) {
		console.info(entryId, `記事本文に ${from.toString()} は存在しない`);
	}

	return newLines.join(CRLF);
};

const dao = new BlogEntryMessageDao(env('SQLITE_BLOG'));

const entryId = argsParsedValues.id !== undefined ? Number(argsParsedValues.id) : undefined;
const dbUpdate = argsParsedValues.update;

/* DB からデータ取得 */
const entryiesMessageDto = await dao.getEntriesMessage(entryId);
if (entryiesMessageDto.size === 0) {
	console.warn(entryId, `記事が存在しない`);
}

const promised = [...entryiesMessageDto].map(async ([id, message]) => {
	const converted = convert(id, message);
	if (dbUpdate) {
		if (message !== converted) {
			console.info(id, `記事更新`);
			await dao.update(id, converted);
		}
	}
});
await Promise.all(promised);
