import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.ts';
import type { Preview } from '../../../@types/api.d.ts';

await test('GET', async () => {
	const res = await app.request('/api/preview');

	assert.equal(res.status, 404);
	assert.equal(res.headers.get('Content-Type')?.startsWith('text/html'), true);
});

await test('invalid paramater', async () => {
	const res = await app.request('/api/preview', {
		method: 'post',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			xxx: 'xxx',
		}),
	});

	assert.equal(res.status, 400);

	const json = (await res.json()) as Preview;

	assert.equal('error' in json, true);
	if ('error' in json) {
		assert.equal(json.error.message, 'The `md` parameter is invalid');
	}
});

await test('not JSON', async () => {
	const res = await app.request('/api/preview', {
		method: 'post',
		body: JSON.stringify({
			md: `text`,
		}),
	});

	assert.equal(res.status, 400);

	const json = (await res.json()) as Preview;

	assert.equal('error' in json, true);
	if ('error' in json) {
		assert.equal(json.error.message, 'The `md` parameter is invalid');
	}
});

await test('no error', async () => {
	const res = await app.request('/api/preview', {
		method: 'post',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			md: `text*em*`,
		}),
	});

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'application/json');

	const json = (await res.json()) as Preview;

	assert.equal('data' in json, true);
	if ('data' in json) {
		assert.equal(json.data.html, '<p>text<em>em</em></p>');
		assert.equal(json.data.messages.length, 0);
	}
});
