import { describe, expect, test } from '@jest/globals';
import MarkdownInline from '../dist/markdown/Inline.js';

test('empty', () => {
	const inline = new MarkdownInline();
	expect(inline.mark('')).toBe('');
});

describe('code', () => {
	const inline = new MarkdownInline();

	test('single', () => {
		expect(inline.mark('<s>text1</s>`<s>code1</s>`<s>text2</s>')).toBe('&#x3C;s>text1&#x3C;/s><code>&#x3C;s>code1&#x3C;/s></code>&#x3C;s>text2&#x3C;/s>');
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>`<s>code1</s>`<s>text2</s>`<s>code2</s>`')).toBe(
			'&#x3C;s>text1&#x3C;/s><code>&#x3C;s>code1&#x3C;/s></code>&#x3C;s>text2&#x3C;/s><code>&#x3C;s>code2&#x3C;/s></code>'
		);
	});

	test('escape', () => {
		expect(inline.mark('<s>text1</s>\\`<s>code1</s>\\`<s>text2</s>')).toBe('&#x3C;s>text1&#x3C;/s>`&#x3C;s>code1&#x3C;/s>`&#x3C;s>text2&#x3C;/s>');
	});
});

describe('anchor', () => {
	const inline = new MarkdownInline();

	test('single', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://example.com/">&#x3C;s>link1&#x3C;/s></a><b class="c-domain">(example.com)</b>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/)<s>text2</s>[<s>link2</s>](https://example.com/)')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://example.com/">&#x3C;s>link1&#x3C;/s></a><b class="c-domain">(example.com)</b>&#x3C;s>text2&#x3C;/s><a href="https://example.com/">&#x3C;s>link2&#x3C;/s></a><b class="c-domain">(example.com)</b>'
		);
	});

	test('text in [', () => {
		expect(inline.mark('[<s>text1</s>][<s>link1</s>](https://example.com/)[<s>text2</s>][<s>link2</s>](https://example.com/)')).toBe(
			'[&#x3C;s>text1&#x3C;/s>]<a href="https://example.com/">&#x3C;s>link1&#x3C;/s></a><b class="c-domain">(example.com)</b>[&#x3C;s>text2&#x3C;/s>]<a href="https://example.com/">&#x3C;s>link2&#x3C;/s></a><b class="c-domain">(example.com)</b>'
		);
	});

	test('URL &', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/?foo=hoge&bar=piyo)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://example.com/?foo=hoge&#x26;bar=piyo">&#x3C;s>link1&#x3C;/s></a><b class="c-domain">(example.com)</b>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('URL text', () => {
		expect(inline.mark('<s>text1</s>[https://example.com/](https://example.com/)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://example.com/">https://example.com/</a>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('icon', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://github.com/)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://github.com/">&#x3C;s>link1&#x3C;/s></a><img src="/image/icon/github.svg" alt="(GitHub)" width="16" height="16" class="c-link-icon"/>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('PDF', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/foo.pdf)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://example.com/foo.pdf">&#x3C;s>link1&#x3C;/s></a><img src="/image/icon/pdf.png" alt="(PDF)" width="16" height="16" class="c-link-icon"/><b class="c-domain">(example.com)</b>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('entry ID', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](1)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="/1">&#x3C;s>link1&#x3C;/s></a>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('amazon', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](amazon:4065199816)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://www.amazon.co.jp/dp/4065199816/ref=nosim?tag=w0s.jp-22">&#x3C;s>link1&#x3C;/s></a><img src="/image/icon/amazon.png" alt="(Amazon)" width="16" height="16" class="c-link-icon"/>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('section', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](#section-1)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="#section-1">&#x3C;s>link1&#x3C;/s></a>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('invalid', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](foo)<s>text2</s>')).toBe('&#x3C;s>text1&#x3C;/s><a>&#x3C;s>link1&#x3C;/s></a>&#x3C;s>text2&#x3C;/s>');
	});
});

describe('emphasis', () => {
	const inline = new MarkdownInline();

	test('single', () => {
		expect(inline.mark('<s>text1</s>**<s>em1</s>**<s>text2</s>')).toBe('&#x3C;s>text1&#x3C;/s><em>&#x3C;s>em1&#x3C;/s></em>&#x3C;s>text2&#x3C;/s>');
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>**<s>em1</s>**<s>text2</s>**<s>em2</s>**')).toBe(
			'&#x3C;s>text1&#x3C;/s><em>&#x3C;s>em1&#x3C;/s></em>&#x3C;s>text2&#x3C;/s><em>&#x3C;s>em2&#x3C;/s></em>'
		);
	});
});

describe('quote', () => {
	const inline = new MarkdownInline();

	test('single', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}<s>text2</s>')).toBe('&#x3C;s>text1&#x3C;/s><q>&#x3C;s>quote1&#x3C;/s></q>&#x3C;s>text2&#x3C;/s>');
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}<s>text2</s>{{<s>quote2</s>}}')).toBe(
			'&#x3C;s>text1&#x3C;/s><q>&#x3C;s>quote1&#x3C;/s></q>&#x3C;s>text2&#x3C;/s><q>&#x3C;s>quote2&#x3C;/s></q>'
		);
	});
});

describe('quote - meta', () => {
	const inline = new MarkdownInline();

	test('URL', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(https://example.com/)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://example.com/"><q cite="https://example.com/">&#x3C;s>quote1&#x3C;/s></q></a><b class="c-domain">(example.com)</b>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('ISBN', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(978-4-06-519981-7)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><q cite="urn:ISBN:978-4-06-519981-7">&#x3C;s>quote1&#x3C;/s></q>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('ISBN - invalid check digit', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(978-4-06-519981-0)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><q>&#x3C;s>quote1&#x3C;/s></q>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('lang', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(en)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><q lang="en">&#x3C;s>quote1&#x3C;/s></q>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('quote - cite - URL & ISBN & lang', async () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(https://example.com/ 978-4-06-519981-7 en)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://example.com/"><q lang="en" cite="https://example.com/">&#x3C;s>quote1&#x3C;/s></q></a><b class="c-domain">(example.com)</b>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('empty', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}()<s>text2</s>')).toBe('&#x3C;s>text1&#x3C;/s><q>&#x3C;s>quote1&#x3C;/s></q>()&#x3C;s>text2&#x3C;/s>');
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(https://example.com/1)<s>text2</s>{{<s>quote2</s>}}(https://example.com/2)')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://example.com/1"><q cite="https://example.com/1">&#x3C;s>quote1&#x3C;/s></q></a><b class="c-domain">(example.com)</b>&#x3C;s>text2&#x3C;/s><a href="https://example.com/2"><q cite="https://example.com/2">&#x3C;s>quote2&#x3C;/s></q></a><b class="c-domain">(example.com)</b>'
		);
	});

	test('multiple (meta, no meta)', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}<s>text2</s>{{<s>quote2</s>}}(https://example.com/)')).toBe(
			'&#x3C;s>text1&#x3C;/s><q>&#x3C;s>quote1&#x3C;/s></q>&#x3C;s>text2&#x3C;/s><a href="https://example.com/"><q cite="https://example.com/">&#x3C;s>quote2&#x3C;/s></q></a><b class="c-domain">(example.com)</b>'
		);
	});

	test('multiple (no meta, meta)', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(https://example.com/)<s>text2</s>{{<s>quote2</s>}}')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://example.com/"><q cite="https://example.com/">&#x3C;s>quote1&#x3C;/s></q></a><b class="c-domain">(example.com)</b>&#x3C;s>text2&#x3C;/s><q>&#x3C;s>quote2&#x3C;/s></q>'
		);
	});
});

describe('footnote', () => {
	const inline = new MarkdownInline();

	test('single', () => {
		expect(inline.mark('<s>text1</s>((<s>footnote1</s>))<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><span class="c-annotate"><a href="#fn1" id="nt1" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[1]</a></span>&#x3C;s>text2&#x3C;/s>'
		);
		expect(inline.footnotes.length).toBe(1);
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>((<s>footnote1</s>))<s>text2</s>((<s>footnote2</s>))')).toBe(
			'&#x3C;s>text1&#x3C;/s><span class="c-annotate"><a href="#fn2" id="nt2" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[2]</a></span>&#x3C;s>text2&#x3C;/s><span class="c-annotate"><a href="#fn3" id="nt3" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[3]</a></span>'
		);
		expect(inline.footnotes.length).toBe(3);
	});
});

describe('mix', () => {
	const inline = new MarkdownInline();

	test('anchor & emphasis & code & quote & footnote', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/)**<s>em1</s>**`<s>code1</s>`{{<s>quote1</s>}}((<s>footnote1</s>))<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://example.com/">&#x3C;s>link1&#x3C;/s></a><b class="c-domain">(example.com)</b><em>&#x3C;s>em1&#x3C;/s></em><code>&#x3C;s>code1&#x3C;/s></code><q>&#x3C;s>quote1&#x3C;/s></q><span class="c-annotate"><a href="#fn1" id="nt1" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[1]</a></span>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('anchor > code', () => {
		expect(inline.mark('<s>text1</s>[`<s>link1</s>`](https://example.com/)<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><a href="https://example.com/"><code>&#x3C;s>link1&#x3C;/s></code></a><b class="c-domain">(example.com)</b>&#x3C;s>text2&#x3C;/s>'
		);
	});

	test('code > anchor', () => {
		expect(inline.mark('<s>text1</s>`[<s>link1</s>](https://example.com/)`<s>text2</s>')).toBe(
			'&#x3C;s>text1&#x3C;/s><code>[&#x3C;s>link1&#x3C;/s>](https://example.com/)</code>&#x3C;s>text2&#x3C;/s>'
		);
	});
});
