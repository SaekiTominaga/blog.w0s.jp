import fs from 'node:fs';
import { strict as assert } from 'node:assert';
import { test, before } from 'node:test';
import app from '../app.js';
import configHono from '../config/hono.js';
import configCategory from '../config/category.js';
import { env } from '../util/env.js';

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
	const htmlFilePath = `${env('HTML')}/${configCategory.html.directory}/${categoryName}${configHono.extension.html}`;
	const htmlBrotliFilePath = `${htmlFilePath}${configHono.extension.brotli}`;

	before(async () => {
		if (fs.existsSync(htmlFilePath)) {
			await Promise.all([fs.promises.unlink(htmlFilePath), fs.promises.unlink(htmlBrotliFilePath)]);
		}
	});

	await t.test('generation', async () => {
		assert.equal(fs.existsSync(htmlFilePath), false);
		assert.equal(fs.existsSync(htmlBrotliFilePath), false);

		const res = await app.request(`/category/${categoryName}`);

		assert.equal(fs.existsSync(htmlFilePath), true);
		assert.equal(fs.existsSync(htmlBrotliFilePath), true);

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
	});

	await t.test('rendering', async () => {
		assert.equal(fs.existsSync(htmlFilePath), true);
		assert.equal(fs.existsSync(htmlBrotliFilePath), true);

		const res = await app.request(`/category/${categoryName}`);

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
	});

	await t.test('304', async () => {
		const res = await app.request(`/category/${categoryName}`, {
			headers: { 'If-Modified-Since': new Date().toUTCString() },
		});

		assert.equal(res.status, 304);
	});
});
