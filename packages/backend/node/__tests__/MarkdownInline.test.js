import { describe, expect, test } from '@jest/globals';
import MarkdownInline from '../dist/markdown/Inline.js';

const inline = new MarkdownInline();

test('empty', () => {
	expect(inline.mark('')).toBe('');
});

describe('code', () => {
	test('single', () => {
		expect(inline.mark('text1`code1`text2')).toBe('text1<code>code1</code>text2');
	});

	test('HTML escape', () => {
		expect(inline.mark('<s>text1</s>`<s>code1</s>`<s>text2</s>')).toBe('&lt;s>text1&lt;/s><code>&lt;s>code1&lt;/s></code>&lt;s>text2&lt;/s>');
	});
});

describe('anchor', () => {
	test('URL &', () => {
		expect(inline.mark('text1[link1](https://example.com/?foo=hoge&bar=piyo)text2')).toBe(
			'text1<a href="https://example.com/?foo=hoge&amp;bar=piyo">link1</a><b class="c-domain">(example.com)</b>text2'
		);
	});

	test('URL text', () => {
		expect(inline.mark('text1[https://example.com/](https://example.com/)text2')).toBe('text1<a href="https://example.com/">https://example.com/</a>text2');
	});

	test('icon', () => {
		expect(inline.mark('text1[link1](https://github.com/)text2')).toBe(
			'text1<a href="https://github.com/">link1</a><img src="/image/icon/github.svg" alt="(GitHub)" width="16" height="16" class="c-link-icon"/>text2'
		);
	});

	test('PDF', () => {
		expect(inline.mark('text1[link1](https://example.com/foo.pdf)text2')).toBe(
			'text1<a href="https://example.com/foo.pdf">link1</a><img src="/image/icon/pdf.png" alt="(PDF)" width="16" height="16" class="c-link-icon"/><b class="c-domain">(example.com)</b>text2'
		);
	});

	test('entry ID', () => {
		expect(inline.mark('text1[link1](1)text2')).toBe('text1<a href="/1">link1</a>text2');
	});

	test('amazon', () => {
		expect(inline.mark('text1[link1](amazon:4065199816)text2')).toBe(
			'text1<a href="https://www.amazon.co.jp/dp/4065199816/ref=nosim?tag=w0s.jp-22">link1</a><img src="/image/icon/amazon.png" alt="(Amazon)" width="16" height="16" class="c-link-icon"/>text2'
		);
	});

	test('section', () => {
		expect(inline.mark('text1[link1](#section-1)text2')).toBe('text1<a href="#section-1">link1</a>text2');
	});

	test('invalid', () => {
		expect(inline.mark('text1[link1](foo)text2')).toBe('text1<a>link1</a>text2');
	});
});

describe('quote', () => {
	test('single', () => {
		expect(inline.mark('text1{{quote1}}text2')).toBe('text1<q>quote1</q>text2');
	});

	test('multiple', () => {
		expect(inline.mark('text1{{quote1}}text2{{quote2}}')).toBe('text1<q>quote1</q>text2<q>quote2</q>');
	});

	test('open only', () => {
		expect(inline.mark('text1{{text2')).toBe('text1{{text2');
	});
});

describe('quote - meta', () => {
	test('URL', () => {
		expect(inline.mark('text1{{quote1}}(https://example.com/)text2')).toBe(
			'text1<a href="https://example.com/"><q cite="https://example.com/">quote1</q></a><b class="c-domain">(example.com)</b>text2'
		);
	});

	test('ISBN', () => {
		expect(inline.mark('text1{{quote1}}(978-4-06-519981-7)text2')).toBe('text1<q cite="urn:ISBN:978-4-06-519981-7">quote1</q>text2');
	});

	test('ISBN - invalid check digit', () => {
		expect(inline.mark('text1{{quote1}}(978-4-06-519981-0)text2')).toBe('text1<q>quote1</q>text2');
	});

	test('lang', () => {
		expect(inline.mark('text1{{quote1}}(en)text2')).toBe('text1<q lang="en">quote1</q>text2');
	});

	test('quote - cite - URL & ISBN & lang', async () => {
		expect(inline.mark('text1{{quote1}}(https://example.com/ 978-4-06-519981-7 en)text2')).toBe(
			'text1<a href="https://example.com/"><q lang="en" cite="https://example.com/">quote1</q></a><b class="c-domain">(example.com)</b>text2'
		);
	});

	test('empty', () => {
		expect(inline.mark('text1{{quote1}}()text2')).toBe('text1<q>quote1</q>()text2');
	});

	test('multiple', () => {
		expect(inline.mark('text1{{quote1}}(https://example.com/1)text2{{<s>quote2</s>}}(https://example.com/2)')).toBe(
			'text1<a href="https://example.com/1"><q cite="https://example.com/1">quote1</q></a><b class="c-domain">(example.com)</b>text2<a href="https://example.com/2"><q cite="https://example.com/2">&lt;s>quote2&lt;/s></q></a><b class="c-domain">(example.com)</b>'
		);
	});

	test('multiple (meta, no meta)', () => {
		expect(inline.mark('text1{{quote1}}text2{{<s>quote2</s>}}(https://example.com/)')).toBe(
			'text1<q>quote1</q>text2<a href="https://example.com/"><q cite="https://example.com/">&lt;s>quote2&lt;/s></q></a><b class="c-domain">(example.com)</b>'
		);
	});

	test('multiple (no meta, meta)', () => {
		expect(inline.mark('text1{{quote1}}(https://example.com/)text2{{<s>quote2</s>}}')).toBe(
			'text1<a href="https://example.com/"><q cite="https://example.com/">quote1</q></a><b class="c-domain">(example.com)</b>text2<q>&lt;s>quote2&lt;/s></q>'
		);
	});
});

describe('footnote', () => {
	test('single', () => {
		const footnote = new MarkdownInline();
		expect(footnote.mark('text1[^f1]text2')).toBe(
			'text1<span class="c-annotate"><a href="#footnote-f1" id="footnote-ref-f1" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[1]</a></span>text2'
		);
		expect(footnote.footnotes.size).toBe(1);
	});

	test('multiple', () => {
		const footnote = new MarkdownInline();
		expect(footnote.mark('text1[^f1]text2[^f2]')).toBe(
			'text1<span class="c-annotate"><a href="#footnote-f1" id="footnote-ref-f1" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[1]</a></span>text2<span class="c-annotate"><a href="#footnote-f2" id="footnote-ref-f2" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[2]</a></span>'
		);
		expect(footnote.footnotes.size).toBe(2);
	});

	test('open only', () => {
		const footnote = new MarkdownInline();
		expect(footnote.mark('text1[^text2')).toBe('text1[^text2');
		expect(footnote.footnotes.size).toBe(0);
	});
});
