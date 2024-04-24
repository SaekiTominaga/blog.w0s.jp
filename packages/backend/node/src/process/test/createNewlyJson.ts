import fs from 'node:fs';
import CreateNewlyJson from '../CreateNewlyJson.js';
import type { NoName as Configure } from '../../../../configure/type/common.js';

const config = JSON.parse(await fs.promises.readFile('configure/common.json', 'utf8')) as Configure;

const result = await new CreateNewlyJson({
	dbFilePath: config.sqlite.db.blog,
	root: config.static.root,
	extentions: {
		json: config.extension.json,
		brotli: config.extension.brotli,
	},
}).execute();
console.debug(result);
