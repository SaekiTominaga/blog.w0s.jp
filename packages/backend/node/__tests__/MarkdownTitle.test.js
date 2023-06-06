import { describe, expect, test } from '@jest/globals';
import MarkdownTitle from '../dist/markdown/Title.js';

describe('code', () => {
	test('single', () => {
		expect(new MarkdownTitle('text1`code1`text2').mark()).toBe('text1<code>code1</code>text2');
	});

	test('multiple', () => {
		expect(new MarkdownTitle('text1`code1``code2`').mark()).toBe(
			'text1<code>code1</code><code>code2</code>'
		);
	});

	test('open only', () => {
		expect(new MarkdownTitle('text1`text2').mark()).toBe('text1`text2');
	});

	test('HTML escape', () => {
		expect(new MarkdownTitle('<s>text1</s>`<s>code1</s>`<s>text2</s>').mark()).toBe('&lt;s&gt;text1&lt;/s&gt;<code>&lt;s&gt;code1&lt;/s&gt;</code>&lt;s&gt;text2&lt;/s&gt;');
	});
});
