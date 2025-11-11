import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { env } from '@w0s/env-value-type';
import app from '../app.ts';
import PostDao from '../db/Post.ts';
import { getAuth } from '../util/auth.ts';

const auth = await getAuth();
const authorization = `Basic ${Buffer.from(`${auth.user}:${auth.password_orig!}`).toString('base64')}`;

await test('no param', async () => {
	const res = await app.request('/admin/', {
		headers: { Authorization: authorization },
	});

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=UTF-8');
});

await test('update', async () => {
	const dao = new PostDao(env('SQLITE_BLOG'));
	const lastModifiledBefore = await dao.getLastModified();

	const res = await app.request('/admin/update', {
		method: 'post',
		headers: { Authorization: authorization },
	});

	const lastModifiledAfter = await dao.getLastModified();

	assert.equal(res.status, 200);
	assert.equal(lastModifiledBefore < lastModifiledAfter, true);
});
