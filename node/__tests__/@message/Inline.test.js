import { describe, expect, test } from '@jest/globals';
import fs from 'fs';
import Inline from '../../dist/util/@message/Inline.js';

const config = JSON.parse(await fs.promises.readFile('node/configure/common.json', 'utf8'));

test('empty', () => {
	const inline = new Inline(config);
	expect(inline.mark('')).toBe('');
});

describe('code', () => {
	const inline = new Inline(config);

	test('single', () => {
		expect(inline.mark('<s>text1</s>`<s>code1</s>`<s>text2</s>')).toBe('&lt;s&gt;text1&lt;/s&gt;<code>&lt;s&gt;code1&lt;/s&gt;</code>&lt;s&gt;text2&lt;/s&gt;');
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>`<s>code1</s>`<s>text2</s>`<s>code2</s>`')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<code>&lt;s&gt;code1&lt;/s&gt;</code>&lt;s&gt;text2&lt;/s&gt;<code>&lt;s&gt;code2&lt;/s&gt;</code>'
		);
	});

	test('escape', () => {
		expect(inline.mark('<s>text1</s>\\`<s>code1</s>\\`<s>text2</s>')).toBe('&lt;s&gt;text1&lt;/s&gt;`&lt;s&gt;code1&lt;/s&gt;`&lt;s&gt;text2&lt;/s&gt;');
	});
});

describe('anchor', () => {
	const inline = new Inline(config, {
		anchor_host_icons: [
			{
				host: 'icon.example.com',
				name: 'Example',
				src: '/example.svg',
			},
		],
		amazon_tracking_id: 'xxx-22',
		section_id_prefix: 'section-',
	});

	test('single', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://example.com/">&lt;s&gt;link1&lt;/s&gt;</a><b class="c-domain">(example.com)</b>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/)<s>text2</s>[<s>link2</s>](https://example.com/)')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://example.com/">&lt;s&gt;link1&lt;/s&gt;</a><b class="c-domain">(example.com)</b>&lt;s&gt;text2&lt;/s&gt;<a href="https://example.com/">&lt;s&gt;link2&lt;/s&gt;</a><b class="c-domain">(example.com)</b>'
		);
	});

	test('text in [', () => {
		expect(inline.mark('[<s>text1</s>][<s>link1</s>](https://example.com/)[<s>text2</s>][<s>link2</s>](https://example.com/)')).toBe(
			'[&lt;s&gt;text1&lt;/s&gt;]<a href="https://example.com/">&lt;s&gt;link1&lt;/s&gt;</a><b class="c-domain">(example.com)</b>[&lt;s&gt;text2&lt;/s&gt;]<a href="https://example.com/">&lt;s&gt;link2&lt;/s&gt;</a><b class="c-domain">(example.com)</b>'
		);
	});

	test('URL &', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/?foo=hoge&bar=piyo)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://example.com/?foo=hoge&amp;bar=piyo">&lt;s&gt;link1&lt;/s&gt;</a><b class="c-domain">(example.com)</b>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('URL text', () => {
		expect(inline.mark('<s>text1</s>[https://example.com/](https://example.com/)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://example.com/">https://example.com/</a>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('icon', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://icon.example.com/)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://icon.example.com/">&lt;s&gt;link1&lt;/s&gt;</a><img src="/example.svg" alt="(Example)" width="16" height="16" class="c-link-icon"/>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('PDF', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/foo.pdf)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://example.com/foo.pdf" type="application/pdf">&lt;s&gt;link1&lt;/s&gt;</a><img src="/image/icon/pdf.png" alt="(PDF)" width="16" height="16" class="c-link-icon"/><b class="c-domain">(example.com)</b>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('entry ID', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](1)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="/1">&lt;s&gt;link1&lt;/s&gt;</a>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('amazon', () => {
		const inlineNoTracking = new Inline(config);
		expect(inlineNoTracking.mark('<s>text1</s>[<s>link1</s>](amazon:4065199816)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://www.amazon.co.jp/dp/4065199816/">&lt;s&gt;link1&lt;/s&gt;</a><img src="/image/icon/amazon.png" alt="(Amazon)" width="16" height="16" class="c-link-icon"/>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('amazon - tracking', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](amazon:4065199816)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://www.amazon.co.jp/dp/4065199816/ref=nosim?tag=xxx-22">&lt;s&gt;link1&lt;/s&gt;</a><img src="/image/icon/amazon.png" alt="(Amazon)" width="16" height="16" class="c-link-icon"/>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('section', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](#section-1)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="#section-1">&lt;s&gt;link1&lt;/s&gt;</a>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('invalid', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](foo)<s>text2</s>')).toBe('&lt;s&gt;text1&lt;/s&gt;[&lt;s&gt;link1&lt;/s&gt;](foo)&lt;s&gt;text2&lt;/s&gt;');
	});
});

describe('emphasis', () => {
	const inline = new Inline(config);

	test('single', () => {
		expect(inline.mark('<s>text1</s>**<s>em1</s>**<s>text2</s>')).toBe('&lt;s&gt;text1&lt;/s&gt;<em>&lt;s&gt;em1&lt;/s&gt;</em>&lt;s&gt;text2&lt;/s&gt;');
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>**<s>em1</s>**<s>text2</s>**<s>em2</s>**')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<em>&lt;s&gt;em1&lt;/s&gt;</em>&lt;s&gt;text2&lt;/s&gt;<em>&lt;s&gt;em2&lt;/s&gt;</em>'
		);
	});

	test('escape', () => {
		expect(inline.mark('<s>text1</s>\\**<s>em1</s>\\**<s>text2</s>')).toBe('&lt;s&gt;text1&lt;/s&gt;**&lt;s&gt;em1&lt;/s&gt;**&lt;s&gt;text2&lt;/s&gt;');
	});
});

describe('quote', () => {
	const inline = new Inline(config);

	test('single', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}<s>text2</s>')).toBe('&lt;s&gt;text1&lt;/s&gt;<q>&lt;s&gt;quote1&lt;/s&gt;</q>&lt;s&gt;text2&lt;/s&gt;');
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}<s>text2</s>{{<s>quote2</s>}}')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<q>&lt;s&gt;quote1&lt;/s&gt;</q>&lt;s&gt;text2&lt;/s&gt;<q>&lt;s&gt;quote2&lt;/s&gt;</q>'
		);
	});
});

describe('quote - meta', () => {
	const inline = new Inline(config);

	test('URL', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(https://example.com/)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://example.com/"><q cite="https://example.com/">&lt;s&gt;quote1&lt;/s&gt;</q></a><b class="c-domain">(example.com)</b>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('ISBN', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(978-4-06-519981-7)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<q cite="urn:ISBN:978-4-06-519981-7">&lt;s&gt;quote1&lt;/s&gt;</q>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('ISBN - invalid check digit', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(978-4-06-519981-0)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<q>&lt;s&gt;quote1&lt;/s&gt;</q>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('lang', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(en)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<q lang="en">&lt;s&gt;quote1&lt;/s&gt;</q>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('quote - cite - URL & ISBN & lang', async () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(https://example.com/ 978-4-06-519981-7 en)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://example.com/"><q lang="en" cite="https://example.com/">&lt;s&gt;quote1&lt;/s&gt;</q></a><b class="c-domain">(example.com)</b>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('empty', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}()<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<q>&lt;s&gt;quote1&lt;/s&gt;</q>()&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(https://example.com/1)<s>text2</s>{{<s>quote2</s>}}(https://example.com/2)')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://example.com/1"><q cite="https://example.com/1">&lt;s&gt;quote1&lt;/s&gt;</q></a><b class="c-domain">(example.com)</b>&lt;s&gt;text2&lt;/s&gt;<a href="https://example.com/2"><q cite="https://example.com/2">&lt;s&gt;quote2&lt;/s&gt;</q></a><b class="c-domain">(example.com)</b>'
		);
	});

	test('multiple (meta, no meta)', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}<s>text2</s>{{<s>quote2</s>}}(https://example.com/)')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<q>&lt;s&gt;quote1&lt;/s&gt;</q>&lt;s&gt;text2&lt;/s&gt;<a href="https://example.com/"><q cite="https://example.com/">&lt;s&gt;quote2&lt;/s&gt;</q></a><b class="c-domain">(example.com)</b>'
		);
	});

	test('multiple (no meta, meta)', () => {
		expect(inline.mark('<s>text1</s>{{<s>quote1</s>}}(https://example.com/)<s>text2</s>{{<s>quote2</s>}}')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://example.com/"><q cite="https://example.com/">&lt;s&gt;quote1&lt;/s&gt;</q></a><b class="c-domain">(example.com)</b>&lt;s&gt;text2&lt;/s&gt;<q>&lt;s&gt;quote2&lt;/s&gt;</q>'
		);
	});
});

describe('footnote', () => {
	const inline = new Inline(config, { entry_id: 1 });

	test('single', () => {
		expect(inline.mark('<s>text1</s>((<s>footnote1</s>))<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<span class="c-annotate"><a href="#fn1-1" id="nt1-1" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[1]</a></span>&lt;s&gt;text2&lt;/s&gt;'
		);
		expect(inline.footnotes.length).toBe(1);
	});

	test('multiple', () => {
		expect(inline.mark('<s>text1</s>((<s>footnote1</s>))<s>text2</s>((<s>footnote2</s>))')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<span class="c-annotate"><a href="#fn1-2" id="nt1-2" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[2]</a></span>&lt;s&gt;text2&lt;/s&gt;<span class="c-annotate"><a href="#fn1-3" id="nt1-3" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[3]</a></span>'
		);
		expect(inline.footnotes.length).toBe(3);
	});
});

describe('mix', () => {
	const inline = new Inline(config, { entry_id: 1 });

	test('anchor & emphasis & code & quote & footnote', () => {
		expect(inline.mark('<s>text1</s>[<s>link1</s>](https://example.com/)**<s>em1</s>**`<s>code1</s>`{{<s>quote1</s>}}((<s>footnote1</s>))<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://example.com/">&lt;s&gt;link1&lt;/s&gt;</a><b class="c-domain">(example.com)</b><em>&lt;s&gt;em1&lt;/s&gt;</em><code>&lt;s&gt;code1&lt;/s&gt;</code><q>&lt;s&gt;quote1&lt;/s&gt;</q><span class="c-annotate"><a href="#fn1-1" id="nt1-1" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[1]</a></span>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('anchor > code', () => {
		expect(inline.mark('<s>text1</s>[`<s>link1</s>`](https://example.com/)<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<a href="https://example.com/"><code>&lt;s&gt;link1&lt;/s&gt;</code></a><b class="c-domain">(example.com)</b>&lt;s&gt;text2&lt;/s&gt;'
		);
	});

	test('code > anchor', () => {
		expect(inline.mark('<s>text1</s>`[<s>link1</s>](https://example.com/)`<s>text2</s>')).toBe(
			'&lt;s&gt;text1&lt;/s&gt;<code><a href="https://example.com/">&lt;s&gt;link1&lt;/s&gt;</a><b class="c-domain">(example.com)</b></code>&lt;s&gt;text2&lt;/s&gt;'
		);
	});
});
