import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { env } from '@w0s/env-value-type';
import { post } from './misskey.ts';

await test('minimum properties', async () => {
	const url = await post({
		url: 'http://exaple.com/entry/1',
		title: 'タイトル',
		description: undefined,
		tags: undefined,
	});

	assert.equal(url.startsWith(`${env('MISSKEY_INSTANCE')}/notes/`), true);
});

await test('all properties', async () => {
	const url = await post({
		url: 'http://exaple.com/entry/1',
		title: 'タイトル<>"\'',
		description: '詳細<>"\'',
		tags: ['タグ1', 'タグ2<>"\'', ''],
	});

	assert.equal(url.startsWith(`${env('MISSKEY_INSTANCE')}/notes/`), true);
});
