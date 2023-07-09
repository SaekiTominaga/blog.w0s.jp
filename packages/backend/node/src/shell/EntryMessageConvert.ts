import fs from 'node:fs';
import { parseArgs } from 'node:util';
import BlogEntryMessageConvertDao from '../dao/BlogEntryMessageConvertDao.js';
import type { NoName as Configure } from '../../../configure/type/common.js';

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

/* 設定ファイル読み込み */
const config = <Configure>JSON.parse(await fs.promises.readFile('configure/common.json', 'utf8'));

const dao = new BlogEntryMessageConvertDao(config.sqlite.db.blog);

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
		const convertedLine = line.replaceAll(/{{(.+?)}}/g, (_match, quote) => {
			console.info(`${id}: ${quote}`);
			return `{${quote}}`;
		}); // TODO: ここに変換処理を書く

		if (index > 0) {
			convertedMessage += LF;
		}
		convertedMessage += convertedLine;
	});

	return convertedMessage;
};

const entryId = argsParsedValues['id'] !== undefined ? Number(argsParsedValues['id']) : undefined;
const dbUpdate = argsParsedValues['dbupdate'];

/* DB からデータ取得 */
const entryiesMessageDto = await dao.getEntriesMessage(entryId);

for (const [id, message] of [...entryiesMessageDto]) {
	const messageConverted = convert(id, message);
	if (dbUpdate !== undefined && dbUpdate) {
		if (message !== messageConverted) {
			console.info(`記事 ${id} を更新`);
			await dao.update(id, messageConverted);
		}
	}
}
