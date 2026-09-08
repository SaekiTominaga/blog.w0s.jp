import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { test } from 'node:test';
import { getCsp, getEntityTagWeak, getReportingEndpoints, supportCompressionEncoding } from './httpHeader.ts';

await test('supportCompressionEncoding', async (t) => {
	await t.test('undefined', () => {
		assert.equal(supportCompressionEncoding(undefined, 'br'), false);
	});

	await t.test('empty', () => {
		assert.equal(supportCompressionEncoding('', 'br'), false);
	});

	await t.test('not exist', () => {
		assert.equal(supportCompressionEncoding('compress, gzip', 'br'), false);
	});

	await t.test('exist', () => {
		assert.equal(supportCompressionEncoding('compress, br, gzip', 'br'), true);
	});

	await t.test('quality value', () => {
		assert.equal(supportCompressionEncoding('compress;q=0.5, br ; q=0.7, gzip; q=1.0', 'br'), true);
	});

	await t.test('wildcard', () => {
		assert.equal(supportCompressionEncoding('gzip;q=1.0, identity; q=0.5, *;q=0', 'br'), false);
	});
});

await test('getCsp', async (t) => {
	await t.test('no type', () => {
		assert.equal(
			getCsp({
				'frame-ancestors': ["'self'"],
				'report-to': ['default'],
			}),
			"frame-ancestors 'self';report-to default",
		);
	});
});

await test('getEntityTagWeak', async () => {
	const stats = await fs.promises.stat('package.json');

	assert.match(getEntityTagWeak(stats)!, /^W\/"[0-9a-f]+-[0-9a-f]+\.[0-9a-f]+"$/u);
});

await test('getReportingEndpoints', () => {
	assert.equal(
		getReportingEndpoints({
			default: 'http://report.example.com/report',
			report1: 'http://report.example.com/report1',
		}),
		'default="http://report.example.com/report",report1="http://report.example.com/report1"',
	);
});
