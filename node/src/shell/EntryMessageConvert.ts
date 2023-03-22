import fs from 'fs';
import BlogEntryMessageConvertDao from '../dao/BlogEntryMessageConvertDao.js';
import { NoName as Configure } from '../../configure/type/common.js';

/**
 * 記事本文の構文書き換え
 */

const convert = (id: number, message: string): string => {
	const CRLF = '\r\n';
	const LF = '\n';

	let convertedMessage = '';
	message
		.replaceAll(CRLF, LF)
		.split(LF)
		.forEach((line, index) => {
			const convertedLine = line.replaceAll(/(.+?)/g, (match, text) => {
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

/* 設定ファイル読み込み */
const config = <Configure>JSON.parse(await fs.promises.readFile('node/configure/common.json', 'utf8'));

const dao = new BlogEntryMessageConvertDao(config);

/* DB からデータ取得 */
const allEntryiesMessageDto = await dao.getAllEntriesMessage();

await Promise.all(
	[...allEntryiesMessageDto].map(async ([id, message]) => {
		const messageConverted = convert(id, message);
		if (message !== messageConverted) {
			console.info(`記事 ${id} を更新`);
			await dao.update(id, messageConverted);
		}
	})
);
