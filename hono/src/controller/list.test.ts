import fs from 'node:fs';
import { strict as assert } from 'node:assert';
import { test, before } from 'node:test';
import { env } from '@w0s/env-value-type';
import app from '../app.ts';
import configHono from '../config/hono.ts';
import configList from '../config/list.ts';

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
	const htmlFilePath = `${env('ROOT')}/${env('HTML_DIR')}/${configList.html.directory}/${String(page)}${configHono.extension.html}`;
	const htmlBrotliFilePath = `${htmlFilePath}${configHono.extension.brotli}`;

	before(async () => {
		if (fs.existsSync(htmlFilePath)) {
			await Promise.all([fs.promises.unlink(htmlFilePath), fs.promises.unlink(htmlBrotliFilePath)]);
		}
	});

	await t.test('generation', async () => {
		assert.equal(fs.existsSync(htmlFilePath), false);
		assert.equal(fs.existsSync(htmlBrotliFilePath), false);

		const res = await app.request(`/list/${String(page)}`);

		assert.equal(fs.existsSync(htmlFilePath), true);
		assert.equal(fs.existsSync(htmlBrotliFilePath), true);

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
	});

	await t.test('rendering', async () => {
		assert.equal(fs.existsSync(htmlFilePath), true);
		assert.equal(fs.existsSync(htmlBrotliFilePath), true);

		const res = await app.request(`/list/${String(page)}`);

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
	});

	await t.test('304', async () => {
		const res = await app.request(`/list/${String(page)}`, {
			headers: { 'If-Modified-Since': new Date().toUTCString() },
		});

		assert.equal(res.status, 304);
	});
});
