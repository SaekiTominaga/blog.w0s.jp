import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { create } from './feed.ts';

await test('create', async () => {
	const createdFilesPath = await create();

	assert.equal(createdFilesPath.length, 2);
});
