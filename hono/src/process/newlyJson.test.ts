import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { create } from './newlyJson.ts';

await test('create', async () => {
	const createdFilesPath = await create();

	assert.equal(createdFilesPath.length, 8);
});
