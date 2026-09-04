import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { clear } from './dsg.ts';

await test('clear', async () => {
	const modified = await clear();

	assert.equal(modified <= new Date(), true);
});
