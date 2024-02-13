import fs from 'node:fs';
import PostMisskey from '../PostMisskey.js';
import type { NoName as Configure } from '../../../../configure/type/common.js';

const config = JSON.parse(await fs.promises.readFile('configure/common.json', 'utf8')) as Configure;

const result = await new PostMisskey('development').execute(
	{ views: config.views },
	{
		id: null,
		title: 'タイトル',
		description: '詳細',
		message: null,
		category: [],
		image: null,
		relation: null,
		public: false,
		timestamp: false,
		social: false,
		social_tag: 'タグ1,タグ2',
		media_overwrite: false,
		action_add: false,
		action_revise: false,
		action_view: false,
		action_revise_preview: false,
		action_media: false,
	},
	'http://exaple.com/entry/1',
);
console.debug(result);
