import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import app from '../../app.ts';
import type { EntriesSummary } from '../../../../@types/api.d.ts';

await test('validator', async (t) => {
	await t.test('no paramater', async () => {
		const res = await app.request('/api/summary');

		assert.equal(res.status, 400);
		assert.equal(res.headers.get('Content-Type'), 'application/json');

		const json = (await res.json()) as EntriesSummary;

		assert.equal('error' in json, true);
		if ('error' in json) {
			assert.equal(json.error.message, 'The `id` parameter is required');
		}
	});
});

await test('no error', async () => {
	const res = await app.request('/api/summary?id=1&id=784&id=9999');

	assert.equal(res.status, 200);
	assert.equal(res.headers.get('Content-Type'), 'application/json');

	const json = (await res.json()) as EntriesSummary;

	assert.equal('data' in json, true);
	if ('data' in json) {
		assert.equal(json.data.length, 3);

		const data1 = json.data.at(0);
		assert.equal(data1?.id, 1);
		assert.equal(data1.title, undefined);

		const data2 = json.data.at(1);
		assert.equal(data2?.id, 784);
		assert.match(data2.title!, /.+/v);
		assert.equal(typeof data2.registedAt, 'string');
		assert.equal(typeof data2.updatedAt, 'string');

		const data3 = json.data.at(2);
		assert.equal(data3?.id, 9999);
		assert.equal(data3.title, undefined);
	}
});
