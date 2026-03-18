import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import clear from './dsg.ts';

await test('clear', async () => {
	const result = await clear();

	assert.equal(result.success, true);
	assert.equal(result.date instanceof Date, true);
});
