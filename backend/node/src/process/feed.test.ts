import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import create from './feed.js';

await test('create', async () => {
	const result = await create();

	assert.deepEqual(result.files, ['../frontend/public/feed.atom', '../frontend/public/feed.atom.br']);
});
