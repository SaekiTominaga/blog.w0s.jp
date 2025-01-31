import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import create from './feed.js';

await test('create', async () => {
	const result = await create();

	assert.equal(result.files.length, 2);
	assert.equal(result.files.includes('../public/feed.atom'), true);
	assert.equal(result.files.includes('../public/feed.atom.br'), true);
});
