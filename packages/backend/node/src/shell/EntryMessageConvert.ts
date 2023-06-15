import fs from 'node:fs';
import { parseArgs } from 'node:util';
import BlogEntryMessageConvertDao from '../dao/BlogEntryMessageConvertDao.js';
import { NoName as Configure } from '../../../configure/type/common.js';

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

const dao = new BlogEntryMessageConvertDao(config);

const convert = (id: number, message: string): string => {
	const CRLF = '\r\n';
	const LF = '\n';

	let convertedMessage = '';
	message
		.replaceAll(CRLF, LF)
		.split(LF)
		.forEach((line, index) => {
			const convertedLine = line.replaceAll(/^\$tweet: (.+)/g, (match, text) => {
				console.info(`${id}: ${match}`);
				return `${text}`;
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
