import fs from 'node:fs';
import { strict as assert } from 'node:assert';
import { before, test } from 'node:test';
import { env } from '@w0s/env-value-type';
import app from '../app.ts';
import configHono from '../config/hono.ts';
import configList from '../config/list.ts';
import { getEntityTagWeak } from '../util/httpHeader.ts';

await test('top page', async () => {
	const res = await app.request('/');

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
});

await test('no param', async () => {
	const res = await app.request('/list');

	assert.equal(res.status, 404);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=UTF-8');
});

await test('zero page', async () => {
	const res = await app.request('/list/0');

	assert.equal(res.status, 404);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=UTF-8');
});

await test('excessive page', async () => {
	const res = await app.request('/list/999');

	assert.equal(res.status, 404);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=UTF-8');
});

await test('exist page', async (t) => {
	const page = 1;
	const htmlFilePath = `${env('ROOT')}/${env('HTML_DIR')}/${configList.html.directory}/${String(page)}.html`;
	const htmlBrotliFilePath = `${htmlFilePath}.br`;

	before(async () => {
		if (fs.existsSync(htmlFilePath)) {
			await Promise.all([fs.promises.unlink(htmlFilePath), fs.promises.unlink(htmlBrotliFilePath)]);
		}
	});

	await t.test('generate cache files', async () => {
		assert.equal(fs.existsSync(htmlFilePath), false);
		assert.equal(fs.existsSync(htmlBrotliFilePath), false);

		const res = await app.request(`/list/${String(page)}`);

		assert.equal(fs.existsSync(htmlFilePath), true);
		assert.equal(fs.existsSync(htmlBrotliFilePath), true);

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
	});

	await t.test('初回訪問', async () => {
		const etag = getEntityTagWeak(await fs.promises.stat(htmlFilePath));

		const res = await app.request(`/list/${String(page)}`);

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
		assert.equal(res.headers.get('ETag'), etag);
	});

	await t.test('304', async () => {
		const etag = getEntityTagWeak(await fs.promises.stat(htmlFilePath));

		const res = await app.request(`/list/${String(page)}`, {
			headers: { 'If-None-Match': etag },
		});

		assert.equal(res.status, 304);
		assert.equal(res.headers.get('Cache-Control'), configHono.response.header.cacheControl);
		assert.equal(res.headers.get('ETag'), etag);
	});
});
