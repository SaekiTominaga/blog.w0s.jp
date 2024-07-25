import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import format from './format.js';
import Markdown from '../dist/markdown/Markdown.js';

test('heaging', async (t) => {
	await t.test('h1', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
text

# 見出し1

text
`,
				),
			),
			`
<p>text</p>
<section class="p-entry-section -hdg1" id="見出し1">
	<div class="p-entry-section__hdg">
		<h2>見出し1</h2>
		<p class="p-entry-section__self-link"><a href="#%E8%A6%8B%E5%87%BA%E3%81%971" class="c-self-link">§</a></p>
	</div>
	<p>text</p>
</section>
`.trim(),
		);
	});

	await t.test('h2', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
text

# 見出し1

text

## 見出し2

text

# 見出し*1*

text
`,
				),
			),
			`
<p>text</p>
<ol aria-label="目次" class="p-toc">
	<li><a href="#%E8%A6%8B%E5%87%BA%E3%81%971">見出し1</a></li>
	<li>
		<a href="#%E8%A6%8B%E5%87%BA%E3%81%971-1">見出し<em>1</em></a>
	</li>
</ol>
<section class="p-entry-section -hdg1" id="見出し1">
	<div class="p-entry-section__hdg">
		<h2>見出し1</h2>
		<p class="p-entry-section__self-link"><a href="#%E8%A6%8B%E5%87%BA%E3%81%971" class="c-self-link">§</a></p>
	</div>
	<p>text</p>
	<section class="p-entry-section -hdg2" id="見出し2">
		<div class="p-entry-section__hdg">
			<h3>見出し2</h3>
			<p class="p-entry-section__self-link"><a href="#%E8%A6%8B%E5%87%BA%E3%81%972" class="c-self-link">§</a></p>
		</div>
		<p>text</p>
	</section>
</section>
<section class="p-entry-section -hdg1" id="見出し1-1">
	<div class="p-entry-section__hdg">
		<h2>見出し<em>1</em></h2>
		<p class="p-entry-section__self-link"><a href="#%E8%A6%8B%E5%87%BA%E3%81%971-1" class="c-self-link">§</a></p>
	</div>
	<p>text</p>
</section>
`.trim(),
		);
	});

	await t.test('h3 or higher', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
### 見出し3

#### 見出し4

##### 見出し5

###### 見出し6

####### 見出し7

text
`,
				),
			),
			`
<h4>見出し3</h4>
<h5>見出し4</h5>
<h6>見出し5</h6>
<p role="heading" aria-level="7">見出し6</p>
<p>####### 見出し7</p>
<p>text</p>
`.trim(),
		);
	});
});

test('paragraph', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('text')), '<p>text</p>'.trim());
	});

	await t.test('blank', async () => {
		const markdown = new Markdown();
		assert.equal(await format(await markdown.toHtml('␣')), ''.trim());
	});
});

test('unordered list', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- list1
- list2
`,
				),
			),
			`
<ul class="p-list">
	<li>list1</li>
	<li>list2</li>
</ul>
`.trim(),
		);
	});

	await t.test('nest', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- list1
- list2
  - list3
`,
				),
			),
			`
<ul class="p-list">
	<li>list1</li>
	<li>
		list2
		<ul class="p-list">
			<li>list3</li>
		</ul>
	</li>
</ul>
`.trim(),
		);
	});
});

test('ordered list', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
1. list1
1. list2
`,
				),
			),
			`
<ol class="p-list-num">
	<li>list1</li>
	<li>list2</li>
</ol>
`.trim(),
		);
	});

	await t.test('start', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
2. list1
3. list2
`,
				),
			),
			`
<ol class="p-list-num" start="2">
	<li>list1</li>
	<li>list2</li>
</ol>
`.trim(),
		);
	});
});

test('link list', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- [list1](http://example.com) text
- [list2](http://example.com) text
`,
				),
			),
			`
<ul class="p-links">
	<li><a href="http://example.com">list1</a><small class="c-domain">(<code>example.com</code>)</small> text</li>
	<li><a href="http://example.com">list2</a><small class="c-domain">(<code>example.com</code>)</small> text</li>
</ul>
`.trim(),
		);
	});

	await t.test('mix', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- [list1](http://example.com) text
- [list2](http://example.com) text
- list3
`,
				),
			),
			`
<ul class="p-list">
	<li><a href="http://example.com">list1</a><small class="c-domain">(<code>example.com</code>)</small> text</li>
	<li><a href="http://example.com">list2</a><small class="c-domain">(<code>example.com</code>)</small> text</li>
	<li>list3</li>
</ul>
`.trim(),
		);
	});
});

test('note', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- note: note1
- note: note*2*
`,
				),
			),
			`
<ul class="p-notes">
	<li>note1</li>
	<li>note<em>2</em></li>
</ul>
`.trim(),
		);
	});

	await t.test('mix', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- note: note1
- note: note*2*
- note3
`,
				),
			),
			`
<ul class="p-list">
	<li>note: note1</li>
	<li>note: note<em>2</em></li>
	<li>note3</li>
</ul>
`.trim(),
		);
	});
});

test('ins', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- 2023-01-01: ins1
- 2023-01-02: ins*2*
`,
				),
			),
			`
<p class="p-insert"><span class="p-insert__date">2023年1月1日追記</span><ins datetime="2023-01-01" class="p-insert__text">ins1</ins></p>
<p class="p-insert">
	<span class="p-insert__date">2023年1月2日追記</span><ins datetime="2023-01-02" class="p-insert__text">ins<em>2</em></ins>
</p>
`.trim(),
		);
	});
});

test('definition list', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
dt1
: dd1-1

dt*2*
: dd2-1
: dd*2-2*
`,
				),
			),
			`
<dl class="p-list-description">
	<dt>dt1</dt>
	<dd>dd1-1</dd>
	<dt>dt<em>2</em></dt>
	<dd>dd2-1</dd>
	<dd>dd<em>2-2</em></dd>
</dl>
`.trim(),
		);
	});
});

test('blockquote', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
> quote1
>
> quote*2*
`,
				),
			),
			`
<figure>
	<blockquote class="p-quote">
		<p>quote1</p>
		<p>quote<em>2</em></p>
	</blockquote>
</figure>
`.trim(),
		);
	});

	await t.test('omit', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
> quote1
>
>~
>
> quote2
`,
				),
			),
			`
<figure>
	<blockquote class="p-quote">
		<p>quote1</p>
		<p><b class="p-quote__omit">(中略)</b></p>
		<p>quote2</p>
	</blockquote>
</figure>
`.trim(),
		);
	});

	await t.test('omit (non japanese)', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
> quote1
>
>~
>
> quote2
>- ?en
`,
				),
			),
			`
<figure>
	<blockquote class="p-quote" lang="en">
		<p>quote1</p>
		<p><b class="p-quote__omit" lang="ja">(中略)</b></p>
		<p>quote2</p>
	</blockquote>
</figure>
`.trim(),
		);
	});

	await t.test('meta text', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
> quote
>
>- ?引用元
`,
				),
			),
			`
<figure>
	<blockquote class="p-quote"><p>quote</p></blockquote>
	<figcaption class="c-caption -meta"><span class="c-caption__text">引用元</span></figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('meta lang', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
> quote
>
>- ?en
`,
				),
			),
			`
<figure>
	<blockquote class="p-quote" lang="en"><p>quote</p></blockquote>
</figure>
`.trim(),
		);
	});

	await t.test('meta url', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
> quote
>
>- ?http://example.com
`,
				),
			),
			`
<figure>
	<blockquote class="p-quote" cite="http://example.com"><p>quote</p></blockquote>
</figure>
`.trim(),
		);
	});

	await t.test('meta isbn', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
> quote
>
>- ?978-4-06-519981-7
`,
				),
			),
			`
<figure>
	<blockquote class="p-quote" cite="urn:ISBN:978-4-06-519981-7"><p>quote</p></blockquote>
</figure>
`.trim(),
		);
	});

	await t.test('meta isbn (invalid)', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
> quote
>
>- ?978-4-06-519981-0
`,
				),
			),
			`
<figure>
	<blockquote class="p-quote"><p>quote</p></blockquote>
</figure>
`.trim(),
		);
	});

	await t.test('meta all', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
> quote
>
>- ?en
>- ?978-4-06-519981-7
>- ?http://example.com
>- ?*引用*元
`,
				),
			),
			`
<figure>
	<blockquote class="p-quote" lang="en" cite="http://example.com"><p>quote</p></blockquote>
	<figcaption class="c-caption -meta">
		<span class="c-caption__text"><a href="http://example.com">引用元</a><small class="c-domain">(<code>example.com</code>)</small></span>
	</figcaption>
</figure>
`.trim(),
		);
	});
});

test('code', async (t) => {
	await t.test('single line', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
\`\`\`
code1
\`\`\`
`,
				),
			),
			`
<div class="p-code">
	<pre class="p-code__code"><code id="code-608b37cf873ae12ce9d2169eeb9f1359">code1</code></pre>
</div>
`.trim(),
		);
	});

	await t.test('multi line', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
\`\`\`
code1
code*2*
\`\`\`
`,
				),
			),
			`
<div class="p-code">
	<div class="p-code__clipboard">
		<button type="button" class="p-code__clipboard-button js-button-clipboard" data-target="code-3247df396b0e96d79af9ae67b7500fea"><img src="/image/entry/copy.svg" alt="コピー" width="16" height="16" /></button>
	</div>
	<pre class="p-code__code"><code id="code-3247df396b0e96d79af9ae67b7500fea">code1
code*2*</code></pre>
</div>
`.trim(),
		);
	});

	await t.test('lang', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
\`\`\`html
<p>code1</p>
<p>code*2*</p>
\`\`\`
`,
				),
			),
			`
<div class="p-code">
	<div class="p-code__clipboard">
		<button type="button" class="p-code__clipboard-button js-button-clipboard" data-target="code-e29e42be83cd7ab3e69a92ec404915c8"><img src="/image/entry/copy.svg" alt="コピー" width="16" height="16" /></button>
	</div>
	<pre class="p-code__code"><code id="code-e29e42be83cd7ab3e69a92ec404915c8" class="hljs lang-html"><span class="hljs-tag">&lt;<span class="hljs-name">p</span>></span>code1<span class="hljs-tag">&lt;/<span class="hljs-name">p</span>></span>
<span class="hljs-tag">&lt;<span class="hljs-name">p</span>></span>code*2*<span class="hljs-tag">&lt;/<span class="hljs-name">p</span>></span></code></pre>
</div>
`.trim(),
		);
	});
});

test('table', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
| th | *th* | th | th |
| - | :- | -: | :-: |
| td | *td* | td | td |
| td | td | td | td |
`,
				),
			),
			`
<table class="p-table">
	<thead>
		<tr>
			<th scope="col">th</th>
			<th scope="col" style="text-align: start"><em>th</em></th>
			<th scope="col" style="text-align: end">th</th>
			<th scope="col" style="text-align: center">th</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>td</td>
			<td style="text-align: start"><em>td</em></td>
			<td style="text-align: end">td</td>
			<td style="text-align: center">td</td>
		</tr>
		<tr>
			<td>td</td>
			<td style="text-align: start">td</td>
			<td style="text-align: end">td</td>
			<td style="text-align: center">td</td>
		</tr>
	</tbody>
</table>
`.trim(),
		);
	});

	await t.test('first row header', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
| ~th | th |
| - | - |
| th | td |
| th | td |
`,
				),
			),
			`
<table class="p-table">
	<thead>
		<tr>
			<th scope="col">th</th>
			<th scope="col">th</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<th scope="row">th</th>
			<td>td</td>
		</tr>
		<tr>
			<th scope="row">th</th>
			<td>td</td>
		</tr>
	</tbody>
</table>
`.trim(),
		);
	});

	await t.test('no thead', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
| td | td |
| td | td |
`,
				),
			),
			`
<p>| td | td | | td | td |</p>
`.trim(),
		);
	});
});

test('box', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
:::normal
text1
:::
`,
				),
			),
			`
<div class="p-box -normal"><p>text1</p></div>
`.trim(),
		);
	});

	await t.test('multi line', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
:::normal
text1

text*2*
:::
`,
				),
			),
			`
<div class="p-box -normal">
	<p>text1</p>
	<p>text<em>2</em></p>
</div>
`.trim(),
		);
	});

	await t.test('last child no text', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
:::normal
text1

text*2*

:::
`,
				),
			),
			`
<div class="p-box -normal">
	<p>text1</p>
	<p>text<em>2</em></p>
</div>
`.trim(),
		);
	});

	await t.test('& > :not(p)', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
:::normal
text1

- list

:::
`,
				),
			),
			`
<div class="p-box -normal">
	<p>text1</p>
	<ul class="p-list">
		<li>list</li>
	</ul>
</div>
`.trim(),
		);
	});

	await t.test('no name', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
:::
text1

text*2*
:::
`,
				),
			),
			`
<p>::: text1</p>
<p>text<em>2</em> :::</p>
`.trim(),
		);
	});

	await t.test('no close', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
:::normal
text1
`,
				),
			),
			`
<p>:::normal text1</p>
`.trim(),
		);
	});
});

test('Image', async (t) => {
	await t.test('JPEG', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@file.jpg: title<title> title
`,
				),
			),
			`
<figure>
	<div class="p-embed">
		<picture
			><source type="image/avif" srcset="https://media.w0s.jp/thumbimage/blog/file.jpg?type=avif;w=640;h=480;quality=60, https://media.w0s.jp/thumbimage/blog/file.jpg?type=avif;w=1280;h=960;quality=30 2x" />
			<source type="image/webp" srcset="https://media.w0s.jp/thumbimage/blog/file.jpg?type=webp;w=640;h=480;quality=60, https://media.w0s.jp/thumbimage/blog/file.jpg?type=webp;w=1280;h=960;quality=30 2x" />
			<img src="https://media.w0s.jp/thumbimage/blog/file.jpg?type=jpeg;w=640;h=480;quality=60" alt="" crossorigin="" class="p-embed__image"
		/></picture>
	</div>
	<figcaption class="c-caption">
		<span class="c-caption__text">title&lt;title> title</span><a href="https://media.w0s.jp/image/blog/file.jpg" class="c-caption__media-expansion"><img src="/image/entry/media-expansion.svg" alt="" width="16" height="16" />オリジナル画像</a>
	</figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('SVG', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@file.svg: title<title> title
`,
				),
			),
			`
<figure>
	<div class="p-embed"><img src="https://media.w0s.jp/image/blog/file.svg" alt="" class="p-embed__image" /></div>
	<figcaption class="c-caption"><span class="c-caption__text">title&lt;title> title</span></figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('MP4', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@file.mp4: title<title> title
`,
				),
			),
			`
<figure>
	<div class="p-embed"><video src="https://media.w0s.jp/video/blog/file.mp4" controls class="p-embed__video"></video></div>
	<figcaption class="c-caption"><span class="c-caption__text">title&lt;title> title</span></figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('invalid extension', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@file.xxx: title<title> title
`,
				),
			),
			`
<figure>
	<div class="p-embed"></div>
	<figcaption class="c-caption"><span class="c-caption__text">title&lt;title> title</span></figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('meta - img size', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@file.jpg: title <1920x1280>
`,
				),
			),
			`
<figure>
	<div class="p-embed">
		<picture
			><source type="image/avif" srcset="https://media.w0s.jp/thumbimage/blog/file.jpg?type=avif;w=640;h=480;quality=60, https://media.w0s.jp/thumbimage/blog/file.jpg?type=avif;w=1280;h=960;quality=30 2x" />
			<source type="image/webp" srcset="https://media.w0s.jp/thumbimage/blog/file.jpg?type=webp;w=640;h=480;quality=60, https://media.w0s.jp/thumbimage/blog/file.jpg?type=webp;w=1280;h=960;quality=30 2x" />
			<img src="https://media.w0s.jp/thumbimage/blog/file.jpg?type=jpeg;w=640;h=480;quality=60" alt="" width="640" height="427" crossorigin="" class="p-embed__image"
		/></picture>
	</div>
	<figcaption class="c-caption">
		<span class="c-caption__text">title</span><a href="https://media.w0s.jp/image/blog/file.jpg" class="c-caption__media-expansion"><img src="/image/entry/media-expansion.svg" alt="" width="16" height="16" />オリジナル画像</a>
	</figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('meta - SVG size', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@file.svg: title <1920x1280>
`,
				),
			),
			`
<figure>
	<div class="p-embed"><img src="https://media.w0s.jp/image/blog/file.svg" alt="" width="1920" height="1280" class="p-embed__image" /></div>
	<figcaption class="c-caption"><span class="c-caption__text">title</span></figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('meta - video size', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@file.mp4: title <1920x1280>
`,
				),
			),
			`
<figure>
	<div class="p-embed"><video src="https://media.w0s.jp/video/blog/file.mp4" controls width="1920" height="1280" class="p-embed__video"></video></div>
	<figcaption class="c-caption"><span class="c-caption__text">title</span></figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('meta - last non Text', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@file.jpg: title<title> \`code\`
`,
				),
			),
			`
<figure>
	<div class="p-embed">
		<picture
			><source type="image/avif" srcset="https://media.w0s.jp/thumbimage/blog/file.jpg?type=avif;w=640;h=480;quality=60, https://media.w0s.jp/thumbimage/blog/file.jpg?type=avif;w=1280;h=960;quality=30 2x" />
			<source type="image/webp" srcset="https://media.w0s.jp/thumbimage/blog/file.jpg?type=webp;w=640;h=480;quality=60, https://media.w0s.jp/thumbimage/blog/file.jpg?type=webp;w=1280;h=960;quality=30 2x" />
			<img src="https://media.w0s.jp/thumbimage/blog/file.jpg?type=jpeg;w=640;h=480;quality=60" alt="" crossorigin="" class="p-embed__image"
		/></picture>
	</div>
	<figcaption class="c-caption">
		<span class="c-caption__text">title&lt;title> <code>code</code></span
		><a href="https://media.w0s.jp/image/blog/file.jpg" class="c-caption__media-expansion"><img src="/image/entry/media-expansion.svg" alt="" width="16" height="16" />オリジナル画像</a>
	</figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('meta - HTML', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@file.jpg: title<title> title <meta>
`,
				),
			),
			`
<figure>
	<div class="p-embed">
		<picture
			><source type="image/avif" srcset="https://media.w0s.jp/thumbimage/blog/file.jpg?type=avif;w=640;h=480;quality=60, https://media.w0s.jp/thumbimage/blog/file.jpg?type=avif;w=1280;h=960;quality=30 2x" />
			<source type="image/webp" srcset="https://media.w0s.jp/thumbimage/blog/file.jpg?type=webp;w=640;h=480;quality=60, https://media.w0s.jp/thumbimage/blog/file.jpg?type=webp;w=1280;h=960;quality=30 2x" />
			<img src="https://media.w0s.jp/thumbimage/blog/file.jpg?type=jpeg;w=640;h=480;quality=60" alt="" crossorigin="" class="p-embed__image"
		/></picture>
	</div>
	<figcaption class="c-caption">
		<span class="c-caption__text">title&lt;title> title</span><a href="https://media.w0s.jp/image/blog/file.jpg" class="c-caption__media-expansion"><img src="/image/entry/media-expansion.svg" alt="" width="16" height="16" />オリジナル画像</a>
	</figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('meta - Text', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@file.jpg: title<title> title <10 10>
`,
				),
			),
			`
<figure>
	<div class="p-embed">
		<picture
			><source type="image/avif" srcset="https://media.w0s.jp/thumbimage/blog/file.jpg?type=avif;w=640;h=480;quality=60, https://media.w0s.jp/thumbimage/blog/file.jpg?type=avif;w=1280;h=960;quality=30 2x" />
			<source type="image/webp" srcset="https://media.w0s.jp/thumbimage/blog/file.jpg?type=webp;w=640;h=480;quality=60, https://media.w0s.jp/thumbimage/blog/file.jpg?type=webp;w=1280;h=960;quality=30 2x" />
			<img src="https://media.w0s.jp/thumbimage/blog/file.jpg?type=jpeg;w=640;h=480;quality=60" alt="" crossorigin="" class="p-embed__image"
		/></picture>
	</div>
	<figcaption class="c-caption">
		<span class="c-caption__text">title&lt;title> title</span><a href="https://media.w0s.jp/image/blog/file.jpg" class="c-caption__media-expansion"><img src="/image/entry/media-expansion.svg" alt="" width="16" height="16" />オリジナル画像</a>
	</figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('no separator', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@file.jpg title
`,
				),
			),
			`
<p>@file.jpg title</p>
`.trim(),
		);
	});
});

test('YouTube', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@youtube: 1234567890 title<title> title
`,
				),
			),
			`
<figure>
	<div class="p-embed"><iframe src="https://www.youtube-nocookie.com/embed/1234567890?cc_load_policy=1" allow="encrypted-media;fullscreen;gyroscope;picture-in-picture" title="YouTube 動画" width="640" height="360" class="p-embed__frame" style="--aspect-ratio: 640/360"></iframe></div>
	<figcaption class="c-caption">
		<span class="c-caption__text"
			><a href="https://www.youtube.com/watch?v=1234567890">title&lt;title> title</a><small class="c-domain"><img src="/image/icon/youtube.svg" alt="(YouTube)" width="16" height="16" /></small
		></span>
	</figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('size', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@youtube: 1234567890 title<title> title <100x150>
`,
				),
			),
			`
<figure>
	<div class="p-embed"><iframe src="https://www.youtube-nocookie.com/embed/1234567890?cc_load_policy=1" allow="encrypted-media;fullscreen;gyroscope;picture-in-picture" title="YouTube 動画" width="100" height="150" class="p-embed__frame" style="--aspect-ratio: 100/150"></iframe></div>
	<figcaption class="c-caption">
		<span class="c-caption__text"
			><a href="https://www.youtube.com/watch?v=1234567890">title&lt;title> title</a><small class="c-domain"><img src="/image/icon/youtube.svg" alt="(YouTube)" width="16" height="16" /></small
		></span>
	</figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('start', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@youtube: 1234567890 title <10s>
`,
				),
			),
			`
<figure>
	<div class="p-embed"><iframe src="https://www.youtube-nocookie.com/embed/1234567890?cc_load_policy=1&amp;start=10" allow="encrypted-media;fullscreen;gyroscope;picture-in-picture" title="YouTube 動画" width="640" height="360" class="p-embed__frame" style="--aspect-ratio: 640/360"></iframe></div>
	<figcaption class="c-caption">
		<span class="c-caption__text"
			><a href="https://www.youtube.com/watch?v=1234567890&amp;t=10s">title</a><small class="c-domain"><img src="/image/icon/youtube.svg" alt="(YouTube)" width="16" height="16" /></small
		></span>
	</figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('start & end', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@youtube: 1234567890 title <10-20s>
`,
				),
			),
			`
<figure>
	<div class="p-embed"><iframe src="https://www.youtube-nocookie.com/embed/1234567890?cc_load_policy=1&amp;start=10&amp;end=20" allow="encrypted-media;fullscreen;gyroscope;picture-in-picture" title="YouTube 動画" width="640" height="360" class="p-embed__frame" style="--aspect-ratio: 640/360"></iframe></div>
	<figcaption class="c-caption">
		<span class="c-caption__text"
			><a href="https://www.youtube.com/watch?v=1234567890&amp;t=10s">title</a><small class="c-domain"><img src="/image/icon/youtube.svg" alt="(YouTube)" width="16" height="16" /></small
		></span>
	</figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('size & start & end', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@youtube: 1234567890 title <100x150 10-20s>
`,
				),
			),
			`
<figure>
	<div class="p-embed"><iframe src="https://www.youtube-nocookie.com/embed/1234567890?cc_load_policy=1&amp;start=10&amp;end=20" allow="encrypted-media;fullscreen;gyroscope;picture-in-picture" title="YouTube 動画" width="100" height="150" class="p-embed__frame" style="--aspect-ratio: 100/150"></iframe></div>
	<figcaption class="c-caption">
		<span class="c-caption__text"
			><a href="https://www.youtube.com/watch?v=1234567890&amp;t=10s">title</a><small class="c-domain"><img src="/image/icon/youtube.svg" alt="(YouTube)" width="16" height="16" /></small
		></span>
	</figcaption>
</figure>
`.trim(),
		);
	});

	await t.test('id invalid', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
@youtube: aaa@
`,
				),
			),
			`
<p>@youtube: aaa@</p>
`.trim(),
		);
	});
});

test('Amazon', async (t) => {
	await t.test('normal', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- @amazon: 1234567890 title<title> title
`,
				),
			),
			`
<aside class="p-amazon">
	<h2 class="p-amazon__hdg"><img src="/image/entry/amazon-buy.png" srcset="/image/entry/amazon-buy@2x.png 2x" alt="Amazon で買う" width="127" height="26" /></h2>
	<ul class="p-amazon__list">
		<li>
			<a class="p-amazon__link" href="https://www.amazon.co.jp/dp/1234567890/ref=nosim?tag=w0s.jp-22"
				><div class="p-amazon__thumb"><img src="/image/entry/amazon-noimage.svg" alt="" width="113" height="160" class="p-amazon__image" /></div>
				<div class="p-amazon__text"><p class="p-amazon__title">title&lt;title> title</p></div></a
			>
		</li>
	</ul>
</aside>
`.trim(),
		);
	});

	await t.test('image', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- @amazon: 1234567890 title<title> title <abcdef>
`,
				),
			),
			`
<aside class="p-amazon">
	<h2 class="p-amazon__hdg"><img src="/image/entry/amazon-buy.png" srcset="/image/entry/amazon-buy@2x.png 2x" alt="Amazon で買う" width="127" height="26" /></h2>
	<ul class="p-amazon__list">
		<li>
			<a class="p-amazon__link" href="https://www.amazon.co.jp/dp/1234567890/ref=nosim?tag=w0s.jp-22"
				><div class="p-amazon__thumb"><img src="https://m.media-amazon.com/images/I/abcdef._SL160_.jpg" srcset="https://m.media-amazon.com/images/I/abcdef._SL320_.jpg 2x" alt="" class="p-amazon__image" /></div>
				<div class="p-amazon__text"><p class="p-amazon__title">title&lt;title> title</p></div></a
			>
		</li>
	</ul>
</aside>
`.trim(),
		);
	});

	await t.test('image size (width > height)', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- @amazon: 1234567890 title <abcdef 150x99>
`,
				),
			),
			`
<aside class="p-amazon">
	<h2 class="p-amazon__hdg"><img src="/image/entry/amazon-buy.png" srcset="/image/entry/amazon-buy@2x.png 2x" alt="Amazon で買う" width="127" height="26" /></h2>
	<ul class="p-amazon__list">
		<li>
			<a class="p-amazon__link" href="https://www.amazon.co.jp/dp/1234567890/ref=nosim?tag=w0s.jp-22"
				><div class="p-amazon__thumb"><img src="https://m.media-amazon.com/images/I/abcdef._SL160_.jpg" srcset="https://m.media-amazon.com/images/I/abcdef._SL320_.jpg 2x" alt="" width="160" height="106" class="p-amazon__image" /></div>
				<div class="p-amazon__text"><p class="p-amazon__title">title</p></div></a
			>
		</li>
	</ul>
</aside>
`.trim(),
		);
	});

	await t.test('image size (width < height)', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- @amazon: 1234567890 title <abcdef 99x150>
`,
				),
			),
			`
<aside class="p-amazon">
	<h2 class="p-amazon__hdg"><img src="/image/entry/amazon-buy.png" srcset="/image/entry/amazon-buy@2x.png 2x" alt="Amazon で買う" width="127" height="26" /></h2>
	<ul class="p-amazon__list">
		<li>
			<a class="p-amazon__link" href="https://www.amazon.co.jp/dp/1234567890/ref=nosim?tag=w0s.jp-22"
				><div class="p-amazon__thumb"><img src="https://m.media-amazon.com/images/I/abcdef._SL160_.jpg" srcset="https://m.media-amazon.com/images/I/abcdef._SL320_.jpg 2x" alt="" width="106" height="160" class="p-amazon__image" /></div>
				<div class="p-amazon__text"><p class="p-amazon__title">title</p></div></a
			>
		</li>
	</ul>
</aside>
`.trim(),
		);
	});

	await t.test('asin invalid', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- @amazon: 1234 title
`,
				),
			),
			`
<ul class="p-list">
	<li>@amazon: 1234 title</li>
</ul>
`.trim(),
		);
	});

	await t.test('multi invalid', async () => {
		const markdown = new Markdown();
		assert.equal(
			await format(
				await markdown.toHtml(
					`
- @amazon: 1234567890 title
- @youtube: 1234567890 title
`,
				),
			),
			`
<ul class="p-list">
	<li>@amazon: 1234567890 title</li>
	<li>@youtube: 1234567890 title</li>
</ul>
`.trim(),
		);
	});
});
