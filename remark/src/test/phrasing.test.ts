import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import Markdown from '../Markdown.ts';
import format from './util/format.ts';

await test('Text', async (t) => {
	await t.test('HTML tag', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('<s class="">text</s> `<s class="">text</s>`')),
			'<p><s class="">text</s> <code>&lt;s class="">text&lt;/s></code></p>',
		);
	});

	await t.test('auto link', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('https://example.com/')), '<p>https://example.com/</p>');
	});
});

await test('link', async (t) => {
	await t.test('internal', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('[link1](https://w0s.jp/)')), '<p><a href="https://w0s.jp/">link1</a></p>');
	});

	await t.test('icon', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('[link1](https://github.com/)')),
			`<p>
	<a href="https://github.com/" rel="external">link1</a><small class="c-domain"><img src="/image/icon/github.svg" alt="(GitHub)" width="16" height="16" /></small>
</p>`,
		);
	});

	await t.test('URL &', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('[link1](https://example.com/?foo=hoge&bar=piyo)')),
			'<p><a href="https://example.com/?foo=hoge&amp;bar=piyo" rel="external">link1</a><small class="c-domain">(<code>example.com</code>)</small></p>',
		);
	});

	await t.test('URL text (no icon)', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('[https://example.com/](https://example.com/)')),
			'<p><a href="https://example.com/" rel="external">https://example.com/</a></p>',
		);
	});

	await t.test('PDF', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('[link1](https://example.com/foo.pdf)')),
			'<p><a href="https://example.com/foo.pdf" rel="external" type="application/pdf">link1</a><img src="/image/icon/pdf.png" alt="(PDF)" width="16" height="16" class="c-link-icon" /><small class="c-domain">(<code>example.com</code>)</small></p>',
		);
	});

	await t.test('entry ID', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('[link1](1)')), '<p><a href="/entry/1">link1</a></p>');
	});

	await t.test('amazon', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(await markdown.toHtml('[link1](https://www.amazon.co.jp/dp/4065199816)')),
			`<p>
	<a href="https://www.amazon.co.jp/dp/4065199816/ref=nosim?tag=w0s.jp-22" rel="external">link1</a><small class="c-domain"><img src="/image/icon/amazon.png" alt="(Amazon)" width="16" height="16" /></small>
</p>`,
		);
	});

	await t.test('section', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('[link1](#section-1)')), '<p><a href="#section-1">link1</a></p>');
	});

	await t.test('invalid', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('[link1](foo)')), '<p><a>link1</a></p>');
	});
});

await test('footnote', async (t) => {
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
			`<p>
	text<span class="c-footnote-ref"><a href="#fn-1" id="fnref-1" class="js-footnote-reference-popover" data-ignore=".p-footnote__backref" data-popover-label="脚注" data-popover-class="p-footnote-popover" data-popover-hide-text="閉じる" data-popover-hide-image-src="/image/footnote-popover-close.svg" data-popover-hide-image-width="24" data-popover-hide-image-height="24">[1]</a></span
	>text
</p>
<section class="p-footnote">
	<h2 class="p-footnote__hdg">脚注</h2>
	<ul class="p-footnote__list">
		<li>
			<span class="p-footnote__no">1.</span>
			<div id="fn-1" class="p-footnote__content">
				<p>ref1 <a href="#fnref-1" class="p-footnote__backref">↩ 戻る</a></p>
			</div>
		</li>
	</ul>
</section>`,
		);
	});
});
