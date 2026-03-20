import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { env } from '@w0s/env-value-type';
import app from '../app.ts';
import { getAuth } from '../util/auth.ts';
import type { Media } from '../../../@types/api.d.ts';

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

	const json = (await res.json()) as Media;

	assert.equal('error' in json, true);
	if ('error' in json) {
		assert.equal(json.error.message, 'Client error');
	}
});

await test('invalid paramater', async (t) => {
	await t.test('no paramater', async () => {
		const res = await app.request('/api/media', {
			method: 'post',
			headers: { Authorization: authorization },
		});

		assert.equal(res.status, 400);

		const json = (await res.json()) as Media;

		assert.equal('error' in json, true);
		if ('error' in json) {
			assert.equal(json.error.message, 'The `files` parameter is required');
		}
	});

	await t.test('files', async (t2) => {
		await t2.test('string', async () => {
			const formData = new FormData();
			formData.append('files', 'foo');

			const res = await app.request('/api/media', {
				method: 'post',
				headers: { Authorization: authorization },
				body: formData,
			});

			assert.equal(res.status, 400);

			const json = (await res.json()) as Media;

			assert.equal('error' in json, true);
			if ('error' in json) {
				assert.equal(json.error.message, 'The `files` parameter is invalid');
			}
		});

		await t2.test('array, not every File', async () => {
			const formData = new FormData();
			formData.append('files', new File(['blob'], 'file'));
			formData.append('files', 'foo');

			const res = await app.request('/api/media', {
				method: 'post',
				headers: { Authorization: authorization },
				body: formData,
			});

			assert.equal(res.status, 400);

			const json = (await res.json()) as Media;

			assert.equal('error' in json, true);
			if ('error' in json) {
				assert.equal(json.error.message, 'The `files` parameter is invalid');
			}
		});
	});

	await t.test('overwrite', async (t2) => {
		await t2.test('array', async () => {
			const formData = new FormData();
			formData.append('files', new File(['blob'], 'file'));
			formData.append('overwrite', '');
			formData.append('overwrite', '');

			const res = await app.request('/api/media', {
				method: 'post',
				headers: { Authorization: authorization },
				body: formData,
			});

			assert.equal(res.status, 400);

			const json = (await res.json()) as Media;

			assert.equal('error' in json, true);
			if ('error' in json) {
				assert.equal(json.error.message, 'The `overwrite` parameter can only be singular');
			}
		});

		await t2.test('object', async () => {
			const formData = new FormData();
			formData.append('files', new File(['blob'], 'file'));
			formData.append('overwrite', new File(['blob'], 'file'));

			const res = await app.request('/api/media', {
				method: 'post',
				headers: { Authorization: authorization },
				body: formData,
			});

			assert.equal(res.status, 400);

			const json = (await res.json()) as Media;

			assert.equal('error' in json, true);
			if ('error' in json) {
				assert.equal(json.error.message, 'The `overwrite` parameter is invalid');
			}
		});
	});
});

await test('no error', async () => {
	const formData = new FormData();
	formData.append('files', new File(['blob'], 'file'));
	formData.append('overwrite', 'foo');

	const res = await app.request('/api/media', {
		method: 'post',
		headers: { Authorization: authorization },
		body: formData,
	});

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'application/json');

	const json = (await res.json()) as Media;

	assert.equal('results' in json, true);
	if ('results' in json) {
		assert.equal(
			json.results.every((result) => !result.success), // media.w0s.jp のローカル環境を起動していない限りエラーになる
			true,
		);
	}
});
