import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { env } from '@w0s/env-value-type';
import app from '../app.ts';
import PostDao from '../db/Post.ts';
import { getAuth } from '../util/auth.ts';
import type { Clear } from '../../../@types/api.d.ts';

const auth = await getAuth(`${env('ROOT')}/${env('AUTH_DIR')}/${env('AUTH_ADMIN')}`);
const authorization = `Basic ${Buffer.from(`${auth.user}:${auth.password_orig!}`).toString('base64')}`;

await test('clear', async () => {
	const dao = new PostDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`);
	const lastModifiledBefore = await dao.getLastModified();

	const res = await app.request('/api/clear', {
		method: 'post',
		headers: { Authorization: authorization },
	});

	const lastModifiledAfter = await dao.getLastModified();

	const json = (await res.json()) as Clear;

	assert.equal(res.status, 200);
	assert.equal('processes' in json && json.processes.every((result) => result.success), true);
	assert.equal(lastModifiledBefore < lastModifiledAfter, true);
});
