import fs from 'node:fs';
import CreateNewlyJson from '../CreateNewlyJson.js';
import type { NoName as Configure } from '../../../../configure/type/common.js';

const config = JSON.parse(await fs.promises.readFile('configure/common.json', 'utf8')) as Configure;

const result = await new CreateNewlyJson().execute({
	dbFilePath: config.sqlite.db.blog,
	root: config.static.root,
});
console.debug(result);
