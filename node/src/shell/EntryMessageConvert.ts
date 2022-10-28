import BlogEntryMessageConvertDao from '../dao/BlogEntryMessageConvertDao.js';
import fs from 'fs';
import { NoName as Configure } from '../../configure/type/common.js';

/**
 * 記事本文の構文書き換え
 */

const convert = (message: string): string => {
	const CRLF = '\r\n';
	const LF = '\n';

	let convertedMessage = '';
	message
		.replaceAll(CRLF, LF)
		.split(LF)
		.forEach((line, index) => {
			const convertedLine = line; // TODO: ここに変換処理を書く

			if (index > 0) {
				convertedMessage += LF;
			}
			convertedMessage += convertedLine;
		});

	return convertedMessage;
};

/* 設定ファイル読み込み */
const config = <Configure>JSON.parse(fs.readFileSync('node/configure/common.json', 'utf8'));

const dao = new BlogEntryMessageConvertDao(config);

/* DB からデータ取得 */
const allEntryiesMessageDto = await dao.getAllEntriesMessage();

for (const [id, message] of allEntryiesMessageDto) {
	await dao.update(id, convert(message));
}
