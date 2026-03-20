import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { env } from '@w0s/env-value-type';
import app from '../app.ts';
import PostDao from '../db/Post.ts';
import { getAuth } from '../util/auth.ts';
import type { Clear } from '../../../@types/api.d.ts';

const auth = await getAuth(`${env('ROOT')}/${env('AUTH_DIR')}/${env('AUTH_ADMIN')}`);
const authorization = `Basic ${Buffer.from(`${auth.user}:${auth.password_orig!}`).toString('base64')}`;

await test('GET', async () => {
	const res = await app.request('/api/clear', {
		headers: { Authorization: authorization },
	});

	assert.equal(res.status, 404);
	assert.equal(res.headers.get('Content-Type')?.startsWith('text/html'), true);
});

await test('no auth', async () => {
	const res = await app.request('/api/clear', {
		method: 'post',
	});

	assert.equal(res.status, 401);

	const json = (await res.json()) as Clear;

	assert.equal('error' in json, true);
	if ('error' in json) {
		assert.equal(json.error.message, 'Client error');
	}
});

await test('no error', async () => {
	const dao = new PostDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`);
	const lastModifiledBefore = await dao.getLastModified();

	const res = await app.request('/api/clear', {
		method: 'post',
		headers: { Authorization: authorization },
	});

	const lastModifiledAfter = await dao.getLastModified();

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'application/json');

	const json = (await res.json()) as Clear;

	assert.equal('processes' in json, true);
	if ('processes' in json) {
		assert.equal(
			json.processes.every((result) => result.success),
			true,
		);
	}
	assert.equal(lastModifiledBefore < lastModifiledAfter, true);
});
