import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { jsToSQLite, sqliteToJS, prepareSelect, prepareInsert, prepareUpdate, prepareDelete } from './sql.js';

await test('jsToSQLite', async (t) => {
	await t.test('string', () => {
		assert.equal(jsToSQLite('text'), 'text');
	});

	await t.test('number', () => {
		assert.equal(jsToSQLite(123), 123);
	});

	await t.test('boolean', () => {
		assert.equal(jsToSQLite(true), 1);
		assert.equal(jsToSQLite(false), 0);
	});

	await t.test('Date', () => {
		assert.equal(jsToSQLite(new Date('2000-01-01')), 946684800);
	});

	await t.test('URL', () => {
		assert.equal(jsToSQLite(new URL('http://example.com/foo?bar#baz')), 'http://example.com/foo?bar#baz');
	});

	await t.test('undefined', () => {
		assert.equal(jsToSQLite(undefined), null);
	});
});

await test('sqliteToJS', async (t) => {
	await t.test('string', () => {
		assert.equal(sqliteToJS('text'), 'text');
	});

	await t.test('number', () => {
		assert.equal(sqliteToJS(123), 123);
	});

	await t.test('boolean', () => {
		assert.equal(sqliteToJS(1, 'boolean'), true);
		assert.equal(sqliteToJS(0, 'boolean'), false);
	});

	await t.test('Date', () => {
		const result = sqliteToJS(946684800, 'date');

		assert.equal(result instanceof Date, true);
		assert.equal(result.getTime(), 946684800000);
	});

	await t.test('URL', () => {
		const result = sqliteToJS('http://example.com/foo?bar#baz', 'url');

		assert.equal(result instanceof URL, true);
		assert.equal(result.toString(), 'http://example.com/foo?bar#baz');
	});

	await t.test('undefined', () => {
		assert.equal(sqliteToJS(null), undefined);
	});

	await t.test('type mismatch', async (t2) => {
		await t2.test('boolean', () => {
			assert.throws(
				() => {
					// @ts-expect-error: ts(2769)
					sqliteToJS('text', 'boolean');
				},
				{ name: 'Error', message: 'Database columns must be a 0 or 1 when convert to a boolean type' },
			);
		});

		await t2.test('Date', () => {
			assert.throws(
				() => {
					// @ts-expect-error: ts(2769)
					sqliteToJS('text', 'date');
				},
				{ name: 'Error', message: 'Database columns must be a integer when convert to a Date type' },
			);
		});

		await t2.test('URL', () => {
			assert.throws(
				() => {
					// @ts-expect-error: ts(2769)
					sqliteToJS(123, 'url');
				},
				{ name: 'Error', message: 'Database columns must be a string type when convert to a URL type' },
			);
		});
	});
});

await test('prepareSelect', () => {
	const { sqlWhere, bindParams } = prepareSelect({
		string: 'foo',
		number: 123,
		undefined: undefined,
	});

	assert.equal(sqlWhere, 'string = :string AND number = :number AND undefined IS NULL');
	assert.deepEqual(bindParams, {
		':string': 'foo',
		':number': 123,
	});
});

await test('prepareInsert', () => {
	const { sqlInto, sqlValues, bindParams } = prepareInsert({
		string: 'foo',
		undefined: undefined,
	});

	assert.equal(sqlInto, '(string, undefined)');
	assert.equal(sqlValues, '(:string, :undefined)');
	assert.deepEqual(bindParams, {
		':string': 'foo',
		':undefined': null,
	});
});

await test('prepareUpdate', () => {
	const { sqlSet, sqlWhere, bindParams } = prepareUpdate(
		{
			string: 'foo',
			undefined: undefined,
		},
		{
			number: 123,
			undefined: undefined,
		},
	);

	assert.equal(sqlSet, 'string = :string, undefined = :undefined');
	assert.equal(sqlWhere, 'number = :number AND undefined IS NULL');
	assert.deepEqual(bindParams, {
		':string': 'foo',
		':undefined': null,
		':number': 123,
	});
});

await test('prepareDelete', () => {
	const { sqlWhere, bindParams } = prepareDelete({
		string: 'foo',
		number: 123,
		undefined: undefined,
	});

	assert.equal(sqlWhere, 'string = :string AND number = :number AND undefined IS NULL');
	assert.deepEqual(bindParams, {
		':string': 'foo',
		':number': 123,
	});
});
