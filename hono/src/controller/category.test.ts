import fs from 'node:fs';
import { strict as assert } from 'node:assert';
import { before, test } from 'node:test';
import { env } from '@w0s/env-value-type';
import app from '../app.ts';
import configHono from '../config/hono.ts';
import configCategory from '../config/category.ts';
import { getEntityTagWeak } from '../util/httpHeader.ts';

await test('no param', async () => {
	const res = await app.request('/category');

	assert.equal(res.status, 404);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=UTF-8');
});

await test('no exit category', async () => {
	const res = await app.request('/category/foo');

	assert.equal(res.status, 404);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=UTF-8');
});

await test('exit category', async (t) => {
	const categoryName = 'HTML';
	const htmlFilePath = `${env('ROOT')}/${env('HTML_DIR')}/${configCategory.html.directory}/${categoryName}.html`;
	const htmlBrotliFilePath = `${htmlFilePath}.br`;

	before(async () => {
		if (fs.existsSync(htmlFilePath)) {
			await Promise.all([fs.promises.unlink(htmlFilePath), fs.promises.unlink(htmlBrotliFilePath)]);
		}
	});

	await t.test('generate cache files', async () => {
		assert.equal(fs.existsSync(htmlFilePath), false);
		assert.equal(fs.existsSync(htmlBrotliFilePath), false);

		const res = await app.request(`/category/${categoryName}`);

		assert.equal(fs.existsSync(htmlFilePath), true);
		assert.equal(fs.existsSync(htmlBrotliFilePath), true);

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
	});

	await t.test('初回訪問', async () => {
		const etag = getEntityTagWeak(await fs.promises.stat(htmlFilePath));

		const res = await app.request(`/category/${categoryName}`);

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
		assert.equal(res.headers.get('ETag'), etag);
	});

	await t.test('304', async () => {
		const etag = getEntityTagWeak(await fs.promises.stat(htmlFilePath));

		const res = await app.request(`/category/${categoryName}`, {
			headers: { 'If-None-Match': etag },
		});

		assert.equal(res.status, 304);
		assert.equal(res.headers.get('Cache-Control'), configHono.response.header.cacheControl);
		assert.equal(res.headers.get('ETag'), etag);
	});
});
