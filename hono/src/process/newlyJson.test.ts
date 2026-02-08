import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
import create from './newlyJson.ts';

Log4js.configure(env('LOG4JS_CONF'));

await test('create', async () => {
	const result = await create();

	assert.equal(result.success, true);
});
