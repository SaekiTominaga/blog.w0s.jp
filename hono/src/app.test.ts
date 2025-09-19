import { strict as assert } from 'node:assert';
import { test, before } from 'node:test';
import { env } from '@w0s/env-value-type';
import app from './app.ts';

await test('headers', async () => {
	const res = await app.request('/');

	assert.equal(res.headers.get('Strict-Transport-Security'), 'max-age=31536000');
	assert.equal(
		res.headers.get('Content-Security-Policy'),
		"base-uri 'none';form-action 'self' https://www.google.com;frame-ancestors 'self';report-uri https://report.w0s.jp/report/csp;report-to default",
	);
	assert.equal(res.headers.get('Reporting-Endpoints'), 'default="https://report.w0s.jp/report/csp"');
	assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
});

await test('redirect', async () => {
	const res = await app.request('/1');

	assert.equal(res.status, 301);
	assert.equal(res.headers.get('Location'), '/entry/1');
});

await test('Top page', async () => {
	const res = await app.request('/');

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
});

await test('favicon.ico', async () => {
	const res = await app.request('/favicon.ico');

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'image/svg+xml;charset=utf-8');
});

await test('serveStatic', async (t) => {
	before(() => {
		process.env['NODE_ENV'] = 'production';
	});

	await t.test('no extension', async () => {
		assert.equal((await app.request('/feed')).status, 200);
	});

	await t.test('Content-Type', async (t2) => {
		await t2.test('hono', async () => {
			assert.equal((await app.request('robots.txt', { headers: { 'Accept-Encoding': 'br' } })).headers.get('Content-Type'), 'text/plain; charset=utf-8');
			assert.equal((await app.request('sitemap.xml', { headers: { 'Accept-Encoding': 'br' } })).headers.get('Content-Type'), 'application/xml');
		});

		await t2.test('added', async () => {
			assert.equal((await app.request('/feed', { headers: { 'Accept-Encoding': 'br' } })).headers.get('Content-Type'), 'application/atom+xml; charset=utf-8');
		});

		await t2.test('node-server#226', async () => {
			assert.equal((await app.request('/json/newly.json', { headers: { 'Accept-Encoding': 'br' } })).headers.get('Content-Type'), 'application/json');
			assert.equal(
				(await app.request('/image/footnote-popover-close.svg', { headers: { 'Accept-Encoding': 'br' } })).headers.get('Content-Type'),
				'image/svg+xml; charset=utf-8',
			);
			assert.equal((await app.request('/style/blog.css', { headers: { 'Accept-Encoding': 'br' } })).headers.get('Content-Type'), 'text/css; charset=utf-8');
			assert.equal(
				(await app.request('/script/blog.mjs', { headers: { 'Accept-Encoding': 'br' } })).headers.get('Content-Type'),
				'text/javascript; charset=utf-8',
			);
			assert.equal(
				(await app.request('/script/analytics.js', { headers: { 'Accept-Encoding': 'br' } })).headers.get('Content-Type'),
				'text/javascript; charset=utf-8',
			);
		});
	});

	await t.test('Cache-Control', async (t2) => {
		await t2.test('path', async () => {
			assert.equal((await app.request('/favicon.ico')).headers.get('Cache-Control'), 'max-age=604800');
		});

		await t2.test('extension', async () => {
			assert.equal((await app.request('/apple-touch-icon.png')).headers.get('Cache-Control'), 'max-age=3600');
			assert.equal((await app.request('/script/blog.mjs.map')).headers.get('Cache-Control'), 'no-cache');
		});

		await t2.test('default', async () => {
			assert.equal((await app.request('/robots.txt')).headers.get('Cache-Control'), 'max-age=600');
		});
	});

	await t.test('SourceMap', async () => {
		assert.equal((await app.request('/script/blog.mjs')).headers.get('SourceMap'), 'blog.mjs.map');
	});
});

await test('CORS', async (t) => {
	await t.test('no origin', async () => {
		const res = await app.request('/json/newly.json');

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
		assert.equal(res.headers.get('Vary'), 'Origin');
		assert.equal(res.headers.get('Content-Type'), 'application/json');
	});

	await t.test('disallow origin', async () => {
		const res = await app.request('/json/newly.json', {
			headers: { Origin: 'http://example.com' },
		});

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
		assert.equal(res.headers.get('Vary'), 'Origin');
		assert.equal(res.headers.get('Content-Type'), 'application/json');
	});

	await t.test('allow origin', async () => {
		const origin = env('JSON_CORS_ORIGINS', 'string[]').at(0)!;

		const res = await app.request('/json/newly.json', {
			headers: { Origin: origin },
		});

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
		assert.equal(res.headers.get('Vary'), 'Origin');
		assert.equal(res.headers.get('Content-Type'), 'application/json');
	});
});

await test('Auth', async () => {
	const res = await app.request('/admin');

	assert.equal(res.status, 401);
	assert.equal(res.headers.get('WWW-Authenticate'), 'Basic realm="Admin"');
});

await test('404', async () => {
	const res = await app.request('/foo');

	assert.equal(res.status, 404);
	assert.equal(res.headers.get('Content-Type'), 'text/html; charset=UTF-8');
});
