import fs from 'node:fs';
import PostMisskey from '../PostMisskey.js';
import type { NoName as Configure } from '../../../../configure/type/common.js';

const config = JSON.parse(await fs.promises.readFile('configure/common.json', 'utf8')) as Configure;

const result = await new PostMisskey({ views: config.views }, 'development').execute({
	url: 'http://exaple.com/entry/1',
	title: 'タイトル',
	description: '詳細',
	tags: ['タグ1', 'タグ2'],
});
console.debug(result);
