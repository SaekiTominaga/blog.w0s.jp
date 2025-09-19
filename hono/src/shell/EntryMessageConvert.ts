import { parseArgs } from 'node:util';
import { env } from '@w0s/env-value-type';
import BlogEntryMessageConvertDao from '../dao/BlogEntryMessageConvertDao.ts';

/**
 * 記事本文の構文書き換え
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

const convert = (id: number, message: string): string => {
	const CRLF = '\r\n';
	const LF = '\n';

	let convertedMessage = '';
	const lines = message.replaceAll(CRLF, LF).split(LF);
	lines.forEach((line, index) => {
		// @ts-expect-error: ts(6133)
		const beforeLine = lines.at(index - 1);
		// @ts-expect-error: ts(6133)
		const afterLine = lines.at(index + 1);
		const convertedLine = line.replaceAll(/\{\{(.+?)\}\}/gv, (_match, quote) => {
			console.info(`${String(id)}: ${String(quote)}`);
			return `{${String(quote)}}`;
		}); // TODO: ここに変換処理を書く

		if (index > 0) {
			convertedMessage += LF;
		}
		convertedMessage += convertedLine;
	});

	return convertedMessage;
};

const entryId = argsParsedValues.id !== undefined ? Number(argsParsedValues.id) : undefined;
const dbUpdate = argsParsedValues.dbupdate;

/* DB からデータ取得 */
const entryiesMessageDto = await dao.getEntriesMessage(entryId);

for (const [id, message] of [...entryiesMessageDto]) {
	const messageConverted = convert(id, message);
	if (dbUpdate) {
		if (message !== messageConverted) {
			console.info(`記事 ${String(id)} を更新`);
			await dao.update(id, messageConverted);
		}
	}
}
