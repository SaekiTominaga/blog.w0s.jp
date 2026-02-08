import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
import clear from './dsg.ts';

Log4js.configure(env('LOG4JS_CONF'));

await test('clear', async () => {
	const result = await clear();

	assert.equal(result.success, true);
	assert.equal(result.date instanceof Date, true);
});
