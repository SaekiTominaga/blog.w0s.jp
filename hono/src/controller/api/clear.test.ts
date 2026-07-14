import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { env } from '@w0s/env-value-type';
import app from '../../app.ts';
import PostDao from '../../db/Post.ts';
import { getAuth } from '../../util/auth.ts';
import type { Post } from '../../../../@types/api.d.ts';

const auth = await getAuth(`${env('ROOT')}/${env('AUTH_DIR')}/${env('AUTH_ADMIN')}`);
const authorization = `Basic ${Buffer.from(`${auth.user}:${auth.password_orig!}`).toString('base64')}`;

await test('GET', async () => {
	const res = await app.request('/api/clear', {
		headers: { Authorization: authorization },
	});

	assert.equal(res.status, 404);
	assert.equal(res.headers.get('Content-Type')?.startsWith('text/html'), true);
});

await test('no auth', async () => {
	const res = await app.request('/api/clear', {
		method: 'post',
	});

	assert.equal(res.status, 401);

	const json = (await res.json()) as Post;

	assert.equal('error' in json, true);
	if ('error' in json) {
		assert.equal(json.error.message, 'Client error');
	}
});

await test('validator', async (t) => {
	await t.test('response', async (t2) => {
		await t2.test('array', async () => {
			const formData = new FormData();
			formData.append('response', 'foo1');
			formData.append('response', 'foo2');

			const res = await app.request('/api/clear', {
				method: 'post',
				headers: { Authorization: authorization },
				body: formData,
			});

			assert.equal(res.status, 400);

			const json = (await res.json()) as Post;

			assert.equal('error' in json, true);
			if ('error' in json) {
				assert.equal(json.error.message, 'The `response` parameter can only be singular');
			}
		});

		await t2.test('invalid string', async () => {
			const formData = new FormData();
			formData.append('response', 'foo');

			const res = await app.request('/api/clear', {
				method: 'post',
				headers: { Authorization: authorization },
				body: formData,
			});

			assert.equal(res.status, 400);

			const json = (await res.json()) as Post;

			assert.equal('error' in json, true);
			if ('error' in json) {
				assert.equal(json.error.message, 'The `response` parameter is invalid');
			}
		});
	});
});

await test('no error', async () => {
	const dao = new PostDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`);
	const lastModifiledBefore = await dao.getLastModified();

	const res = await app.request('/api/clear', {
		method: 'post',
		headers: { Authorization: authorization },
	});

	const lastModifiledAfter = await dao.getLastModified();

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'application/json');
	assert.equal(lastModifiledBefore < lastModifiledAfter, true);
});

await test('response', async (t) => {
	await t.test('JSON', async () => {
		const res = await app.request('/api/clear', {
			method: 'post',
			headers: { Authorization: authorization },
		});

		const json = (await res.json()) as Post;

		assert.equal(Array.isArray(json), true);
		if (Array.isArray(json)) {
			assert.equal(
				json.every((result) => result.success),
				true,
			);
		}
	});

	await t.test('Text', async () => {
		const formData = new FormData();
		formData.append('response', 'text');

		const res = await app.request('/api/clear', {
			method: 'post',
			headers: { Authorization: authorization },
			body: formData,
		});

		const text = await res.text();

		assert.match(
			text,
			/^✅ DB 最終更新日時の記録に成功 <[0-9]{2}:[0-9]{2}:[0-9]{2}>\n✅ フィード生成に成功（[0-9]+ファイル）\n✅ サイトマップ生成に成功（[0-9]+ファイル）\n✅ 新着 JSON ファイル生成に成功（[0-9]+ファイル）\n\n$/v,
		);
	});
});
