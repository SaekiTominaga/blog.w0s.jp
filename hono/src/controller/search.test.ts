import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../app.ts';

await test('no param', async () => {
	const res = await app.request('/search');

	assert.equal(res.status, 400);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=UTF-8');
});

await test('engine param', async (t) => {
	await t.test('invalid string', async () => {
		const res = await app.request('/search?engine=abc');

		assert.equal(res.status, 400);
	});

	await t.test('array', async () => {
		const res = await app.request('/search?engine=ddg&engine=ddg');

		assert.equal(res.status, 400);
	});
});

await test('q param', async (t) => {
	await t.test('no param', async () => {
		const res = await app.request('/search?engine=ddg');

		assert.equal(res.status, 400);
	});

	await t.test('array', async () => {
		const res = await app.request('/search?engine=ddg&q=&q=');

		assert.equal(res.status, 400);
	});
});

await test('searvice', async (t) => {
	await t.test('google', async () => {
		const res = await app.request('/search?engine=google&q=text');

		assert.equal(res.status, 301);
		assert.equal(res.headers.get('location'), 'https://www.google.com/search?as_sitesearch=blog.w0s.jp&q=text');
	});

	await t.test('yahoo', async () => {
		const res = await app.request('/search?engine=yahoo&q=text');

		assert.equal(res.status, 301);
		assert.equal(res.headers.get('location'), 'https://search.yahoo.co.jp/search?p=text+site%3Ablog.w0s.jp');
	});

	await t.test('bing', async () => {
		const res = await app.request('/search?engine=bing&q=text');

		assert.equal(res.status, 301);
		assert.equal(res.headers.get('location'), 'https://www.bing.com/search?q=text+site%3Ablog.w0s.jp');
	});

	await t.test('ddg', async () => {
		const res = await app.request('/search?engine=ddg&q=text');

		assert.equal(res.status, 301);
		assert.equal(res.headers.get('location'), 'https://duckduckgo.com/?q=text+site%3Ablog.w0s.jp');
	});
});
