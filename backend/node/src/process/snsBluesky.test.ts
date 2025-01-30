import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import post from './snsBluesky.js';

await test('minimum properties', async () => {
	const result = await post({
		url: 'http://exaple.com/entry/1',
		title: 'タイトル',
		description: null,
		tags: null,
	});

	assert.equal(/at:\/\/did:plc:[a-z0-9]+\/app\.bsky\.feed\.post\/[a-z0-9]+/.test(result.uri), true);
	assert.equal(/[a-z0-9]+/.test(result.cid), true);
	assert.equal(result.profileUrl, 'https://bsky.app/profile/w0s.bsky.social');
});

await test('all properties', async () => {
	const result = await post({
		url: 'http://exaple.com/entry/1',
		title: 'タイトル<>"\'',
		description: '詳細<>"\'',
		tags: ['タグ1', 'タグ2<>"\'', ''],
	});

	assert.equal(/at:\/\/did:plc:[a-z0-9]+\/app\.bsky\.feed\.post\/[a-z0-9]+/.test(result.uri), true);
	assert.equal(/[a-z0-9]+/.test(result.cid), true);
	assert.equal(result.profileUrl, 'https://bsky.app/profile/w0s.bsky.social');
});
