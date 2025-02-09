import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getEntryUrl } from './blogUrl.js';

process.env['ORIGIN'] = 'http://example.com';

await test('getEntryUrl', () => {
	assert.equal(getEntryUrl(123), 'http://example.com/entry/123');
});
