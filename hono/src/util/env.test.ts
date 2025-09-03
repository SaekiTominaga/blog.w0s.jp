import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { env } from './env.ts';

process.env['TEST_STRING'] = 'foo';
process.env['TEST_STRINGS'] = 'foo bar baz';
process.env['TEST_NUMBER'] = '1';
process.env['TEST_NUMBERS'] = '1 2 3';
process.env['TEST_BOOLEAN1'] = 'true';
process.env['TEST_BOOLEAN2'] = 'false';

await test('exist key', async (t) => {
	await t.test('no type', () => {
		assert.equal(env('TEST_STRING'), 'foo');
	});

	await t.test('string', () => {
		assert.equal(env('TEST_STRING', 'string'), 'foo');
	});

	await t.test('string[]', () => {
		assert.deepEqual(env('TEST_STRINGS', 'string[]'), ['foo', 'bar', 'baz']);
	});

	await t.test('number', () => {
		assert.equal(env('TEST_NUMBER', 'number'), 1);
	});

	await t.test('number[]', () => {
		assert.deepEqual(env('TEST_NUMBERS', 'number[]'), [1, 2, 3]);
	});

	await t.test('true', () => {
		assert.equal(env('TEST_BOOLEAN1', 'boolean'), true);
	});

	await t.test('false', () => {
		assert.equal(env('TEST_BOOLEAN2', 'boolean'), false);
	});
});

await test('non exist key', () => {
	assert.throws(
		() => {
			env('TEST_XXX');
		},
		{ name: 'Error', message: 'process.env["TEST_XXX"] not defined' },
	);
});
