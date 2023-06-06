import { describe, expect, test } from '@jest/globals';
import MarkdownInline from '../dist/markdown/Inline.js';

test('empty', () => {
	const inline = new MarkdownInline();
	expect(inline.mark('')).toBe('');
});

describe('code', () => {
	const inline = new MarkdownInline();

	test('single', () => {
		expect(inline.mark('<s>text1</s>`<s>code1</s>`<s>text2</s>')).toBe('&lt;s>text1&lt;/s><code>&lt;s>code1&lt;/s></code>&lt;s>text2&lt;/s>');
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>`<s>code1</s>`<s>text2</s>`<s>code2</s>`')).toBe(
			'&lt;s>text1&lt;/s><code>&lt;s>code1&lt;/s></code>&lt;s>text2&lt;/s><code>&lt;s>code2&lt;/s></code>'
		);
	});

	test('escape', () => {
		expect(inline.mark('<s>text1</s>\\`<s>code1</s>\\`<s>text2</s>')).toBe('&lt;s>text1&lt;/s>`&lt;s>code1&lt;/s>`&lt;s>text2&lt;/s>');
	});
});

describe('anchor', () => {
	const inline = new MarkdownInline();

	test('single', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><a href="https://example.com/">&lt;s>link1&lt;/s></a><b class="c-domain">(example.com)</b>&lt;s>text2&lt;/s>'
		);
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/)<s>text2</s>[<s>link2</s>](https://example.com/)')).toBe(
			'&lt;s>text1&lt;/s><a href="https://example.com/">&lt;s>link1&lt;/s></a><b class="c-domain">(example.com)</b>&lt;s>text2&lt;/s><a href="https://example.com/">&lt;s>link2&lt;/s></a><b class="c-domain">(example.com)</b>'
		);
	});

	test('text in [', () => {
		expect(inline.mark('[<s>text1</s>][<s>link1</s>](https://example.com/)[<s>text2</s>][<s>link2</s>](https://example.com/)')).toBe(
			'[&lt;s>text1&lt;/s>]<a href="https://example.com/">&lt;s>link1&lt;/s></a><b class="c-domain">(example.com)</b>[&lt;s>text2&lt;/s>]<a href="https://example.com/">&lt;s>link2&lt;/s></a><b class="c-domain">(example.com)</b>'
		);
	});

	test('URL &', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/?foo=hoge&bar=piyo)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><a href="https://example.com/?foo=hoge&amp;bar=piyo">&lt;s>link1&lt;/s></a><b class="c-domain">(example.com)</b>&lt;s>text2&lt;/s>'
		);
	});

	test('URL text', () => {
		expect(inline.mark('<s>text1</s>[https://example.com/](https://example.com/)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><a href="https://example.com/">https://example.com/</a>&lt;s>text2&lt;/s>'
		);
	});

	test('icon', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://github.com/)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><a href="https://github.com/">&lt;s>link1&lt;/s></a><img src="/image/icon/github.svg" alt="(GitHub)" width="16" height="16" class="c-link-icon"/>&lt;s>text2&lt;/s>'
		);
	});

	test('PDF', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/foo.pdf)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><a href="https://example.com/foo.pdf">&lt;s>link1&lt;/s></a><img src="/image/icon/pdf.png" alt="(PDF)" width="16" height="16" class="c-link-icon"/><b class="c-domain">(example.com)</b>&lt;s>text2&lt;/s>'
		);
	});

	test('entry ID', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](1)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><a href="/1">&lt;s>link1&lt;/s></a>&lt;s>text2&lt;/s>'
		);
	});

	test('amazon', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](amazon:4065199816)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><a href="https://www.amazon.co.jp/dp/4065199816/ref=nosim?tag=w0s.jp-22">&lt;s>link1&lt;/s></a><img src="/image/icon/amazon.png" alt="(Amazon)" width="16" height="16" class="c-link-icon"/>&lt;s>text2&lt;/s>'
		);
	});

	test('section', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](#section-1)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><a href="#section-1">&lt;s>link1&lt;/s></a>&lt;s>text2&lt;/s>'
		);
	});

	test('invalid', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](foo)<s>text2</s>')).toBe('&lt;s>text1&lt;/s><a>&lt;s>link1&lt;/s></a>&lt;s>text2&lt;/s>');
	});
});

describe('quote', () => {
	const inline = new MarkdownInline();

	test('single', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}<s>text2</s>')).toBe('&lt;s>text1&lt;/s><q>&lt;s>quote1&lt;/s></q>&lt;s>text2&lt;/s>');
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}<s>text2</s>{{<s>quote2</s>}}')).toBe(
			'&lt;s>text1&lt;/s><q>&lt;s>quote1&lt;/s></q>&lt;s>text2&lt;/s><q>&lt;s>quote2&lt;/s></q>'
		);
	});
});

describe('quote - meta', () => {
	const inline = new MarkdownInline();

	test('URL', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(https://example.com/)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><a href="https://example.com/"><q cite="https://example.com/">&lt;s>quote1&lt;/s></q></a><b class="c-domain">(example.com)</b>&lt;s>text2&lt;/s>'
		);
	});

	test('ISBN', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(978-4-06-519981-7)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><q cite="urn:ISBN:978-4-06-519981-7">&lt;s>quote1&lt;/s></q>&lt;s>text2&lt;/s>'
		);
	});

	test('ISBN - invalid check digit', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(978-4-06-519981-0)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><q>&lt;s>quote1&lt;/s></q>&lt;s>text2&lt;/s>'
		);
	});

	test('lang', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(en)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><q lang="en">&lt;s>quote1&lt;/s></q>&lt;s>text2&lt;/s>'
		);
	});

	test('quote - cite - URL & ISBN & lang', async () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(https://example.com/ 978-4-06-519981-7 en)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><a href="https://example.com/"><q lang="en" cite="https://example.com/">&lt;s>quote1&lt;/s></q></a><b class="c-domain">(example.com)</b>&lt;s>text2&lt;/s>'
		);
	});

	test('empty', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}()<s>text2</s>')).toBe('&lt;s>text1&lt;/s><q>&lt;s>quote1&lt;/s></q>()&lt;s>text2&lt;/s>');
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(https://example.com/1)<s>text2</s>{{<s>quote2</s>}}(https://example.com/2)')).toBe(
			'&lt;s>text1&lt;/s><a href="https://example.com/1"><q cite="https://example.com/1">&lt;s>quote1&lt;/s></q></a><b class="c-domain">(example.com)</b>&lt;s>text2&lt;/s><a href="https://example.com/2"><q cite="https://example.com/2">&lt;s>quote2&lt;/s></q></a><b class="c-domain">(example.com)</b>'
		);
	});

	test('multiple (meta, no meta)', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}<s>text2</s>{{<s>quote2</s>}}(https://example.com/)')).toBe(
			'&lt;s>text1&lt;/s><q>&lt;s>quote1&lt;/s></q>&lt;s>text2&lt;/s><a href="https://example.com/"><q cite="https://example.com/">&lt;s>quote2&lt;/s></q></a><b class="c-domain">(example.com)</b>'
		);
	});

	test('multiple (no meta, meta)', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(https://example.com/)<s>text2</s>{{<s>quote2</s>}}')).toBe(
			'&lt;s>text1&lt;/s><a href="https://example.com/"><q cite="https://example.com/">&lt;s>quote1&lt;/s></q></a><b class="c-domain">(example.com)</b>&lt;s>text2&lt;/s><q>&lt;s>quote2&lt;/s></q>'
		);
	});
});

describe('footnote', () => {
	const inline = new MarkdownInline();

	test('single', () => {
		expect(inline.mark('<s>text1</s>((<s>footnote1</s>))<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><span class="c-annotate"><a href="#fn1" id="nt1" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[1]</a></span>&lt;s>text2&lt;/s>'
		);
		expect(inline.footnotes.length).toBe(1);
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>((<s>footnote1</s>))<s>text2</s>((<s>footnote2</s>))')).toBe(
			'&lt;s>text1&lt;/s><span class="c-annotate"><a href="#fn2" id="nt2" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[2]</a></span>&lt;s>text2&lt;/s><span class="c-annotate"><a href="#fn3" id="nt3" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[3]</a></span>'
		);
		expect(inline.footnotes.length).toBe(3);
	});
});

describe('mix', () => {
	const inline = new MarkdownInline();

	test('anchor & emphasis & code & quote & footnote', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/)*<s>em1</s>*`<s>code1</s>`{{<s>quote1</s>}}((<s>footnote1</s>))<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><a href="https://example.com/">&lt;s>link1&lt;/s></a><b class="c-domain">(example.com)</b><em>&lt;s>em1&lt;/s></em><code>&lt;s>code1&lt;/s></code><q>&lt;s>quote1&lt;/s></q><span class="c-annotate"><a href="#fn1" id="nt1" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[1]</a></span>&lt;s>text2&lt;/s>'
		);
	});

	test('anchor > code', () => {
		expect(inline.mark('<s>text1</s>[`<s>link1</s>`](https://example.com/)<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><a href="https://example.com/"><code>&lt;s>link1&lt;/s></code></a><b class="c-domain">(example.com)</b>&lt;s>text2&lt;/s>'
		);
	});

	test('code > anchor', () => {
		expect(inline.mark('<s>text1</s>`[<s>link1</s>](https://example.com/)`<s>text2</s>')).toBe(
			'&lt;s>text1&lt;/s><code>[&lt;s>link1&lt;/s>](https://example.com/)</code>&lt;s>text2&lt;/s>'
		);
	});
});
