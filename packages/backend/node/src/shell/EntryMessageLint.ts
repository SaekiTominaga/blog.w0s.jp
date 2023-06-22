import fs from 'node:fs';
import { parseArgs } from 'node:util';
import Markdown from '../markdown/Markdown.js';
import BlogEntryMessageConvertDao from '../dao/BlogEntryMessageConvertDao.js';
import { NoName as Configure } from '../../../configure/type/common.js';

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

/* 設定ファイル読み込み */
const config = <Configure>JSON.parse(await fs.promises.readFile('configure/common.json', 'utf8'));

const dao = new BlogEntryMessageConvertDao(config.sqlite.db.blog);

const entryId = argsParsedValues['id'] !== undefined ? Number(argsParsedValues['id']) : undefined;

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

			console.warn(id, `${line}:${column} ${reason} <${ruleId}>`);
		});
	}
}
