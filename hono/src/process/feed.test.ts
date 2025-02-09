import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import create from './feed.js';

await test('create', async () => {
	const result = await create();

	assert.equal(result.success, true);
});
