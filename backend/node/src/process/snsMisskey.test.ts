import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import post from './snsMisskey.js';

await test('minimum properties', async () => {
	const result = await post({
		url: 'http://exaple.com/entry/1',
		title: 'タイトル',
		description: null,
		tags: null,
	});

	assert.equal(/https:\/\/misskey\.noellabo\.jp\/notes\/[a-z0-9]+/.test(result.url), true);
	assert.equal(result.content, `タイトル http://exaple.com/entry/1`);
});

await test('all properties', async () => {
	const result = await post({
		url: 'http://exaple.com/entry/1',
		title: 'タイトル<>"\'',
		description: '詳細<>"\'',
		tags: ['タグ1', 'タグ2<>"\'', ''],
	});

	assert.equal(/https:\/\/misskey\.noellabo\.jp\/notes\/[a-z0-9]+/.test(result.url), true);
	assert.equal(result.content, `タイトル<>"' http://exaple.com/entry/1\n\n詳細<>"'\n\n#タグ1 #タグ2<>"'`);
});
