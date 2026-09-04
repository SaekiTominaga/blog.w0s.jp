import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { env } from '@w0s/env-value-type';
import app from '../app.ts';
import { getAuthFile } from '../util/auth.ts';

const auth = (await getAuthFile(`${env('ROOT')}/${env('AUTH_DIR')}/${env('AUTH_FILE_ADMIN')}`)).at(0);
const authorization = `Basic ${Buffer.from(`${String(auth?.username)}:${String(auth?.password.orig)}`).toString('base64')}`;

await test('no param', async () => {
	const res = await app.request('/admin/', {
		headers: { Authorization: authorization },
	});

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=UTF-8');
});
