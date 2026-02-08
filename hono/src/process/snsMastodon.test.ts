import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
import post from './snsMastodon.ts';

Log4js.configure(env('LOG4JS_CONF'));

await test('minimum properties', async () => {
	const result = await post({
		url: 'http://exaple.com/entry/1',
		title: 'タイトル',
		description: undefined,
		tags: undefined,
	});

	assert.equal(result.success, true);
});

await test('all properties', async () => {
	const result = await post({
		url: 'http://exaple.com/entry/1',
		title: 'タイトル<>"\'',
		description: '詳細<>"\'',
		tags: ['タグ1', 'タグ2<>"\'', ''],
	});

	assert.equal(result.success, true);
});
