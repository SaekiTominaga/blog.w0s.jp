import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.ts';
import type { Preview } from '../../../@types/api.d.ts';

await test('GET', async () => {
	const res = await app.request('/api/preview');

	assert.equal(res.status, 404);
});

await test('not JSON', async () => {
	const res = await app.request('/api/preview', {
		method: 'post',
	});

	assert.equal(res.status, 400); // TODO: 本来はレスポンスボディのチェックもすべきだが、現在は仮で HTML が返るためテスト不可
});

await test('invalid paramater', async () => {
	const res = await app.request('/api/preview', {
		method: 'post',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			xxx: 'xxx',
		}),
	});

	assert.equal(res.status, 400); // TODO: 本来はレスポンスボディのチェックもすべきだが、現在は仮で HTML が返るためテスト不可
});

await test('no error', async () => {
	const res = await app.request('/api/preview', {
		method: 'post',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			md: `text*em*`,
		}),
	});

	const responseBody = (await res.json()) as Preview;

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'application/json');
	assert.equal(responseBody.html, '<p>text<em>em</em></p>');
	assert.equal(responseBody.messages.length, 0);
});
