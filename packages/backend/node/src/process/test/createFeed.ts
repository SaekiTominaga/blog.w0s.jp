import fs from 'node:fs';
import CreateFeed from '../CreateFeed.js';
import type { NoName as Configure } from '../../../../configure/type/common.js';

const config = JSON.parse(await fs.promises.readFile('configure/common.json', 'utf8')) as Configure;

const result = await new CreateFeed({
	dbFilePath: config.sqlite.db.blog,
	views: config.views,
	prettierConfig: config.prettier.config,
	root: config.static.root,
}).execute();
console.debug(result);
