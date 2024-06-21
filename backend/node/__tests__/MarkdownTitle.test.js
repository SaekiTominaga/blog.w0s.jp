import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import MarkdownTitle from '../dist/markdown/Title.js';

test('code', async (t) => {
	await t.test('single', () => {
		assert.equal(new MarkdownTitle('text1`code1`text2').mark(), 'text1<code>code1</code>text2');
	});

	await t.test('multiple', () => {
		assert.equal(new MarkdownTitle('text1`code1``code2`').mark(), 'text1<code>code1</code><code>code2</code>');
	});

	await t.test('open only', () => {
		assert.equal(new MarkdownTitle('text1`text2').mark(), 'text1`text2');
	});

	await t.test('HTML escape', () => {
		assert.equal(
			new MarkdownTitle('<s>text1</s>`<s>code1</s>`<s>text2</s>').mark(),
			'&lt;s&gt;text1&lt;/s&gt;<code>&lt;s&gt;code1&lt;/s&gt;</code>&lt;s&gt;text2&lt;/s&gt;',
		);
	});
});
