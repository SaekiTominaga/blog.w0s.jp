import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import format from './format.js';
import Markdown from '../dist/markdown/Markdown.js';

test('Text', async (t) => {
	await t.test('HTML tag', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('<s class="">text</s> `<s class="">text</s>`')),
			'<p>&lt;s class="">text&lt;/s> <code>&lt;s class="">text&lt;/s></code></p>'.trim(),
		);
	});

	await t.test('auto link', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('https://example.com/')), '<p>https://example.com/</p>'.trim());
	});
});

test('link', async (t) => {
	await t.test('URL &', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('text1[link1](https://example.com/?foo=hoge&bar=piyo)text2')),
			'<p>text1<a href="https://example.com/?foo=hoge&amp;bar=piyo">link1</a><small class="c-domain">(<code>example.com</code>)</small> text2</p>'.trim(),
		);
	});

	await t.test('URL text', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('text1[https://example.com/](https://example.com/)text2')),
			'<p>text1<a href="https://example.com/">https://example.com/</a>text2</p>'.trim(),
		);
	});

	await t.test('icon', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('text1[link1](https://github.com/)text2')),
			`<p>
	text1<a href="https://github.com/">link1</a><small class="c-domain"><img src="/image/icon/github.svg" alt="(GitHub)" width="16" height="16" /></small> text2
</p>`.trim(),
		);
	});

	await t.test('PDF', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('text1[link1](https://example.com/foo.pdf)text2')),
			'<p>text1<a href="https://example.com/foo.pdf">link1</a><img src="/image/icon/pdf.png" alt="(PDF)" width="16" height="16" class="c-link-icon" /><small class="c-domain">(<code>example.com</code>)</small> text2</p>'.trim(),
		);
	});

	await t.test('entry ID', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('text1[link1](1)text2')), '<p>text1<a href="/1">link1</a>text2</p>'.trim());
	});

	await t.test('amazon', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('text1[link1](amazon:4065199816)text2')),
			`<p>
	text1<a href="https://www.amazon.co.jp/dp/4065199816/ref=nosim?tag=w0s.jp-22">link1</a><small class="c-domain"><img src="/image/icon/amazon.png" alt="(Amazon)" width="16" height="16" /></small> text2
</p>`.trim(),
		);
	});

	await t.test('section', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('text1[link1](#section-1)text2')), '<p>text1<a href="#section-1">link1</a>text2</p>'.trim());
	});

	await t.test('invalid', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('text1[link1](foo)text2')), '<p>text1<a>link1</a>text2</p>'.trim());
	});
});

test('quote', async (t) => {
	await t.test('single', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('text1{quote1}text2')), '<p>text1<q>quote1</q>text2</p>'.trim());
	});

	await t.test('multiple', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('text1{quote1}text2{quote2}')), '<p>text1<q>quote1</q>text2<q>quote2</q></p>'.trim());
	});

	await t.test('meta URL', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('text1{quote1}(https://example.com/)text2')),
			`
<p>
	text1<a href="https://example.com/"><q cite="https://example.com/">quote1</q></a
	><small class="c-domain">(<code>example.com</code>)</small> text2
</p>
`.trim(),
		);
	});

	await t.test('meta ISBN', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('text1{quote1}(978-4-06-519981-7)text2')),
			'<p>text1<q cite="urn:ISBN:978-4-06-519981-7">quote1</q>text2</p>'.trim(),
		);
	});

	await t.test('meta ISBN - invalid check digit', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('text1{quote1}(978-4-06-519981-0)text2')), '<p>text1<q>quote1</q>text2</p>'.trim());
	});

	await t.test('meta lang', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('text1{quote1}(en)text2')), '<p>text1<q lang="en">quote1</q>text2</p>'.trim());
	});

	await t.test('meta all', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('text1{quote1}(https://example.com/ 978-4-06-519981-7 en)text2')),
			`
<p>
	text1<a href="https://example.com/"><q lang="en" cite="https://example.com/">quote1</q></a
	><small class="c-domain">(<code>example.com</code>)</small> text2
</p>
`.trim(),
		);
	});

	await t.test('meta empty', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('text1{quote1}()text2')), '<p>text1<q>quote1</q>()text2</p>'.trim());
	});

	await t.test('open only', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('text1{text2')), '<p>text1{text2</p>'.trim());
	});

	await t.test('in <code>', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('text1`{code}`text2')), '<p>text1<code>{code}</code>text2</p>'.trim());
	});
});

test('footnote', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
text[^1]text

[^1]: ref1
`,
				),
			),
			`
<p>
	text<span class="c-footnote-ref"><a href="#fn-1" id="fnref-1" class="js-footnote-reference-popover" data-popover-label="脚注" data-popover-class="p-footnote-popover" data-popover-hide-text="閉じる" data-popover-hide-image-src="/image/footnote-popover-close.svg" data-popover-hide-image-width="24" data-popover-hide-image-height="24">[1]</a></span
	>text
</p>
<section class="p-footnote">
	<h2 class="p-footnote__hdg">脚注</h2>
	<ul class="p-footnote__list">
		<li>
			<span class="p-footnote__no">1.</span>
			<p class="p-footnote__content"><span id="fn-1">ref1</span> <a href="#fnref-1" class="p-footnote__backref">↩ 戻る</a></p>
		</li>
	</ul>
</section>
`.trim(),
		);
	});
});
