import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { env } from '@w0s/env-value-type';
import app from '../app.ts';
import { getAuth } from '../util/auth.ts';

const auth = await getAuth(env('AUTH_ADMIN'));
const authorization = `Basic ${Buffer.from(`${auth.user}:${auth.password_orig!}`).toString('base64')}`;

await test('no param', async () => {
	const res = await app.request('/admin/', {
		headers: { Authorization: authorization },
	});

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=UTF-8');
});
