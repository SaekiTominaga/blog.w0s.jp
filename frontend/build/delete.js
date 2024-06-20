import fs from 'node:fs';
import { parseArgs } from 'node:util';
import slash from 'slash';

/**
 * ファイル削除
 */

/* 引数処理 */
const argsParsedValues = parseArgs({
	options: {
		files: {
			type: 'string',
			short: 'f',
			multiple: true,
		},
	},
}).values;

if (argsParsedValues.files === undefined) {
	throw new Error('Argument `files` not specified');
}
const filesPath = argsParsedValues.files?.map((file) => slash(file));

const files = fs.promises.glob(filesPath);

for await (const file of files) {
	await fs.promises.unlink(file);
	console.info(`File deleted: ${file}`);
}
