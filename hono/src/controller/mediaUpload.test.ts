import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { after, before, test } from 'node:test';
import sharp from 'sharp';
import { env } from '@w0s/env-value-type';
import app from '../app.ts';
import configProcess from '../config/process.ts';
import { getAuth } from '../util/auth.ts';
import type { MediaUpload } from '../../../@types/api.d.ts';

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
	const res = await app.request('/api/media', {
		method: 'post',
	});

	assert.equal(res.status, 401);

	const json = (await res.json()) as MediaUpload;

	assert.equal('error' in json, true);
	if ('error' in json) {
		assert.equal(json.error.message, 'Client error');
	}
});

await test('validator', async (t) => {
	await t.test('no paramater', async () => {
		const res = await app.request('/api/media', {
			method: 'post',
			headers: { Authorization: authorization },
		});

		assert.equal(res.status, 400);

		const json = (await res.json()) as MediaUpload;

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

			const json = (await res.json()) as MediaUpload;

			assert.equal('error' in json, true);
			if ('error' in json) {
				assert.equal(json.error.message, 'The `files` parameter is invalid');
			}
		});

		await t2.test('array, not every File', async () => {
			const formData = new FormData();
			formData.append('files', new File([], 'file'));
			formData.append('files', 'foo');

			const res = await app.request('/api/media', {
				method: 'post',
				headers: { Authorization: authorization },
				body: formData,
			});

			assert.equal(res.status, 400);

			const json = (await res.json()) as MediaUpload;

			assert.equal('error' in json, true);
			if ('error' in json) {
				assert.equal(json.error.message, 'The `files` parameter is invalid');
			}
		});
	});

	await t.test('overwrite', async (t2) => {
		await t2.test('array', async () => {
			const formData = new FormData();
			formData.append('files', new File([], 'file'));
			formData.append('overwrite', '');
			formData.append('overwrite', '');

			const res = await app.request('/api/media', {
				method: 'post',
				headers: { Authorization: authorization },
				body: formData,
			});

			assert.equal(res.status, 400);

			const json = (await res.json()) as MediaUpload;

			assert.equal('error' in json, true);
			if ('error' in json) {
				assert.equal(json.error.message, 'The `overwrite` parameter can only be singular');
			}
		});

		await t2.test('object', async () => {
			const formData = new FormData();
			formData.append('files', new File([], 'file'));
			formData.append('overwrite', new File([], 'file'));

			const res = await app.request('/api/media', {
				method: 'post',
				headers: { Authorization: authorization },
				body: formData,
			});

			assert.equal(res.status, 400);

			const json = (await res.json()) as MediaUpload;

			assert.equal('error' in json, true);
			if ('error' in json) {
				assert.equal(json.error.message, 'The `overwrite` parameter is invalid');
			}
		});
	});
});

await test('image', async (t) => {
	const fileNamePrefix = '_test';

	after(async () => {
		const filePaths = [
			...(await fs.promises.readdir(`${env('ROOT')}/${configProcess.media.image.dir}`, { withFileTypes: true }))
				.filter((resource) => resource.isFile() && resource.name.startsWith(fileNamePrefix))
				.map((file) => `${env('ROOT')}/${configProcess.media.image.dir}/${file.name}`),
			...(await fs.promises.readdir(`${env('ROOT')}/${configProcess.media.image.thumbDir}`, { withFileTypes: true }))
				.filter((resource) => resource.isFile() && resource.name.startsWith(fileNamePrefix))
				.map((file) => `${env('ROOT')}/${configProcess.media.image.thumbDir}/${file.name}`),
		];

		await Promise.all(filePaths.map((filePath) => fs.promises.unlink(filePath)));
	});

	await t.test('overwrite', async () => {
		const fileName = `${fileNamePrefix}0001.jpg`;
		const filePath = `${env('ROOT')}/${configProcess.media.image.dir}/${fileName}`;

		before(async () => {
			await fs.promises.writeFile(filePath, '');
		});
		after(async () => {
			await fs.promises.unlink(filePath);
		});

		const formData = new FormData();
		formData.append('files', new File([], fileName, { type: 'image/foo' }));

		assert.equal(fs.existsSync(filePath), true);

		const res = await app.request('/api/media', {
			method: 'post',
			headers: { Authorization: authorization },
			body: formData,
		});

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'application/json');

		const json = (await res.json()) as MediaUpload;

		assert.equal('results' in json, true);
		if ('results' in json) {
			assert.equal(json.results.length, 1);
			assert.equal(json.results.at(0)?.success, false);
			assert.equal(json.results.at(0)?.message, configProcess.media.processMessageUpload.overwrite);
		}
	});

	await t.test('size', async () => {
		const fileName = `${fileNamePrefix}0002.jpg`;
		const filePath = `${env('ROOT')}/${configProcess.media.image.dir}/${fileName}`;

		const formData = new FormData();
		formData.append('files', new File(['x'.repeat(configProcess.media.image.limit + 1)], fileName, { type: 'image/foo' }));

		assert.equal(fs.existsSync(filePath), false);

		const res = await app.request('/api/media', {
			method: 'post',
			headers: { Authorization: authorization },
			body: formData,
		});

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'application/json');

		const json = (await res.json()) as MediaUpload;

		assert.equal('results' in json, true);
		if ('results' in json) {
			assert.equal(json.results.length, 1);
			assert.equal(json.results.at(0)?.success, false);
			assert.equal(json.results.at(0)?.message, configProcess.media.processMessageUpload.size);
			assert.equal(fs.existsSync(filePath), false);
		}
	});

	await t.test('success', async (t2) => {
		await t2.test('svg', async () => {
			const fileName = `${fileNamePrefix}0003.svg`;
			const filePath = `${env('ROOT')}/${configProcess.media.image.dir}/${fileName}`;

			const formData = new FormData();
			formData.append('files', new File([], fileName, { type: 'image/svg+xml' }));

			assert.equal(fs.existsSync(filePath), false);

			const res = await app.request('/api/media', {
				method: 'post',
				headers: { Authorization: authorization },
				body: formData,
			});

			assert.equal(res.status, 200);
			assert.equal(res.headers.get('Content-Type'), 'application/json');

			const json = (await res.json()) as MediaUpload;

			assert.equal('results' in json, true);
			if ('results' in json) {
				assert.equal(json.results.length, 1);
				assert.equal(json.results.at(0)?.success, true);
				assert.equal(json.results.at(0)?.message, configProcess.media.processMessageUpload.success);
				assert.equal(json.results.at(0)?.thumbnails, undefined);
				assert.equal(fs.existsSync(filePath), true);
			}
		});

		await t2.test('thumbnail create', async () => {
			const fileName = `${fileNamePrefix}0004.jpg`;
			const filePath = `${env('ROOT')}/${configProcess.media.image.dir}/${fileName}`;

			const image = sharp({
				text: {
					text: 'Hello, world!',
					width: 1920,
					height: 1280,
				},
			}).jpeg({ quality: 1 });

			const formData = new FormData();
			formData.append('files', new File([(await image.toBuffer()) as BlobPart], fileName, { type: 'image/foo' }));

			assert.equal(fs.existsSync(filePath), false);

			const res = await app.request('/api/media', {
				method: 'post',
				headers: { Authorization: authorization },
				body: formData,
			});

			assert.equal(res.status, 200);
			assert.equal(res.headers.get('Content-Type'), 'application/json');

			const json = (await res.json()) as MediaUpload;

			assert.equal('results' in json, true);
			if ('results' in json) {
				assert.equal(json.results.length, 1);
				assert.equal(json.results.at(0)?.success, true);
				assert.equal(json.results.at(0)?.message, configProcess.media.processMessageUpload.success);
				assert.equal(json.results.at(0)?.thumbnails?.length, 4);
				assert.equal(fs.existsSync(filePath), true);
			}
		});
	});
});

await test('video', async (t) => {
	const fileNamePrefix = '_test';

	after(async () => {
		const filePaths = (await fs.promises.readdir(`${env('ROOT')}/${configProcess.media.video.dir}`, { withFileTypes: true }))
			.filter((resource) => resource.isFile() && resource.name.startsWith(fileNamePrefix))
			.map((file) => `${env('ROOT')}/${configProcess.media.video.dir}/${file.name}`);

		await Promise.all(filePaths.map((filePath) => fs.promises.unlink(filePath)));
	});

	await t.test('success', async () => {
		const fileName = `${fileNamePrefix}0001.mp4`;
		const filePath = `${env('ROOT')}/${configProcess.media.video.dir}/${fileName}`;

		const formData = new FormData();
		formData.append('files', new File(['videoblob'], fileName, { type: 'video/foo' }));

		assert.equal(fs.existsSync(filePath), false);

		const res = await app.request('/api/media', {
			method: 'post',
			headers: { Authorization: authorization },
			body: formData,
		});

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Type'), 'application/json');

		const json = (await res.json()) as MediaUpload;

		assert.equal('results' in json, true);
		if ('results' in json) {
			assert.equal(json.results.length, 1);
			assert.equal(json.results.at(0)?.success, true);
			assert.equal(json.results.at(0)?.message, configProcess.media.processMessageUpload.success);
			assert.equal(fs.existsSync(filePath), true);
		}
	});
});

await test('text', async () => {
	const fileNamePrefix = '_test';

	const formData = new FormData();
	formData.append('files', new File([], `${fileNamePrefix}0001.txt`, { type: 'text/foo' }));
	formData.append('files', new File([], `${fileNamePrefix}0002.txt`, { type: 'text/bar' }));

	const res = await app.request('/api/media', {
		method: 'post',
		headers: { Authorization: authorization },
		body: formData,
	});

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'application/json');

	const json = (await res.json()) as MediaUpload;

	assert.equal('results' in json, true);
	if ('results' in json) {
		assert.equal(json.results.length, 2);
		assert.equal(json.results.at(0)?.success, false);
		assert.equal(json.results.at(0)?.message, configProcess.media.processMessageUpload.type);
	}
});
