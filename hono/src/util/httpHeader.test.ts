import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { supportCompressionEncoding, csp, reportingEndpoints } from './httpHeader.js';

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

await test('csp', async (t) => {
	await t.test('no type', () => {
		assert.equal(
			csp({
				'frame-ancestors': ["'self'"],
				'report-to': ['default'],
			}),
			"frame-ancestors 'self';report-to default",
		);
	});
});

await test('reportingEndpoints', () => {
	assert.equal(
		reportingEndpoints({
			default: 'http://report.example.com/report',
			report1: 'http://report.example.com/report1',
		}),
		'default="http://report.example.com/report",report1="http://report.example.com/report1"',
	);
});
