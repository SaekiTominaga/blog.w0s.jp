import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.js';
import BlogPostDao from '../dao/BlogPostDao.js';
import { getAuth } from '../util/auth.js';
import { env } from '../util/env.js';

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
	const dao = new BlogPostDao(env('SQLITE_BLOG'));
	const lastModifiledBefore = await dao.getLastModified();

	const res = await app.request('/admin/update', {
		method: 'post',
		headers: { Authorization: authorization },
	});

	const lastModifiledAfter = await dao.getLastModified();

	assert.equal(res.status, 200);
	assert.equal(lastModifiledBefore < lastModifiledAfter, true);
});
