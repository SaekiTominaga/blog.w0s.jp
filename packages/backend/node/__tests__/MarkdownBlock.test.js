import { describe, expect, test } from '@jest/globals';
import prettier from 'prettier';
import Markdown from '../dist/markdown/Markdown.js';

const format = (vFile) => {
	const value = vFile.value.toString();
	const formatted = prettier.format(value, {
		endOfLine: 'lf',
		printWidth: 9999,
		useTabs: true,
		parser: 'html',
	});
	return formatted.trim();
};

describe('heaging', () => {
	test('h1', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
text

# 見出し1

text
`
				)
			)
		).toBe(
			`
<p>text</p>
<section class="p-entry-section -hdg1" id="見出し1">
	<hgroup>
		<h2>見出し1</h2>
		<p class="p-entry-section__self-link"><a href="#%E8%A6%8B%E5%87%BA%E3%81%971" class="c-self-link">§</a></p>
	</hgroup>
	<p>text</p>
</section>
`.trim()
		);
	});

	test('h2', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
text

# 見出し1

text

## 見出し2

text

# 見出し*1*

text
`
				)
			)
		).toBe(
			`
<p>text</p>
<ol aria-label="目次" class="p-toc">
	<li><a href="#%E8%A6%8B%E5%87%BA%E3%81%971">見出し1</a></li>
	<li>
		<a href="#%E8%A6%8B%E5%87%BA%E3%81%971-1">見出し<em>1</em></a>
	</li>
</ol>
<section class="p-entry-section -hdg1" id="見出し1">
	<hgroup>
		<h2>見出し1</h2>
		<p class="p-entry-section__self-link"><a href="#%E8%A6%8B%E5%87%BA%E3%81%971" class="c-self-link">§</a></p>
	</hgroup>
	<p>text</p>
	<section class="p-entry-section -hdg2" id="見出し2">
		<hgroup>
			<h3>見出し2</h3>
			<p class="p-entry-section__self-link"><a href="#%E8%A6%8B%E5%87%BA%E3%81%972" class="c-self-link">§</a></p>
		</hgroup>
		<p>text</p>
	</section>
</section>
<section class="p-entry-section -hdg1" id="見出し1-1">
	<hgroup>
		<h2>見出し<em>1</em></h2>
		<p class="p-entry-section__self-link"><a href="#%E8%A6%8B%E5%87%BA%E3%81%971-1" class="c-self-link">§</a></p>
	</hgroup>
	<p>text</p>
</section>
`.trim()
		);
	});

	test('h3 or higher', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
### 見出し3

#### 見出し4

##### 見出し5

###### 見出し6

####### 見出し7

text
`
				)
			)
		).toBe(
			`
<h4>見出し3</h4>
<h5>見出し4</h5>
<h6>見出し5</h6>
<p role="heading" aria-level="7">見出し6</p>
<p>####### 見出し7</p>
<p>text</p>
`.trim()
		);
	});
});

describe('paragraph', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(format(await markdown.toHtml('text'))).toBe('<p>text</p>'.trim());
	});
});

describe('unordered list', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
- list1
- list2
`
				)
			)
		).toBe(
			`
<ul class="p-list">
	<li>list1</li>
	<li>list2</li>
</ul>
`.trim()
		);
	});

	test('nest', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
- list1
- list2
  - list3
`
				)
			)
		).toBe(
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
`.trim()
		);
	});
});

describe('ordered list', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
1. list1
1. list2
`
				)
			)
		).toBe(
			`
<ol class="p-list-num">
	<li>list1</li>
	<li>list2</li>
</ol>
`.trim()
		);
	});

	test('start', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
2. list1
3. list2
`
				)
			)
		).toBe(
			`
<ol class="p-list-num" start="2">
	<li>list1</li>
	<li>list2</li>
</ol>
`.trim()
		);
	});
});

describe('link list', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
- [list1](http://example.com) text
- [list2](http://example.com) text
`
				)
			)
		).toBe(
			`
<ul class="p-links">
	<li><a href="http://example.com">list1</a><b class="c-domain">(example.com)</b> text</li>
	<li><a href="http://example.com">list2</a><b class="c-domain">(example.com)</b> text</li>
</ul>
`.trim()
		);
	});

	test('mix', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
- [list1](http://example.com) text
- [list2](http://example.com) text
- list3
`
				)
			)
		).toBe(
			`
<ul class="p-list">
	<li><a href="http://example.com">list1</a><b class="c-domain">(example.com)</b> text</li>
	<li><a href="http://example.com">list2</a><b class="c-domain">(example.com)</b> text</li>
	<li>list3</li>
</ul>
`.trim()
		);
	});
});

describe('note', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
- note: note1
- note: note*2*
`
				)
			)
		).toBe(
			`
<ul class="p-notes">
	<li>note1</li>
	<li>note<em>2</em></li>
</ul>
`.trim()
		);
	});

	test('mix', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
- note: note1
- note: note*2*
- note3
`
				)
			)
		).toBe(
			`
<ul class="p-list">
	<li>note: note1</li>
	<li>note: note<em>2</em></li>
	<li>note3</li>
</ul>
`.trim()
		);
	});
});

describe('ins', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
- 2023-01-01: ins1
- 2023-01-02: ins*2*
`
				)
			)
		).toBe(
			`
<p class="p-insert"><span class="p-insert__date">2023年1月1日追記</span><ins datetime="2023-01-01" class="p-insert__text">ins1</ins></p>
<p class="p-insert">
	<span class="p-insert__date">2023年1月2日追記</span><ins datetime="2023-01-02" class="p-insert__text">ins<em>2</em></ins>
</p>
`.trim()
		);
	});
});

describe('definition list', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
dt1
: dd1-1

dt*2*
: dd2-1
: dd*2-2*
`
				)
			)
		).toBe(
			`
<dl class="p-list-description">
	<dt>dt1</dt>
	<dd>dd1-1</dd>
	<dt>dt<em>2</em></dt>
	<dd>dd2-1</dd>
	<dd>dd<em>2-2</em></dd>
</dl>
`.trim()
		);
	});
});

describe('blockquote', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
> quote1
>
> quote*2*
`
				)
			)
		).toBe(
			`
<figure>
	<blockquote class="p-quote">
		<p>quote1</p>
		<p>quote<em>2</em></p>
	</blockquote>
</figure>
`.trim()
		);
	});

	test('omit', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
> quote1
>
>~
>
> quote2
`
				)
			)
		).toBe(
			`
<figure>
	<blockquote class="p-quote">
		<p>quote1</p>
		<p><b class="p-quote__omit">(中略)</b></p>
		<p>quote2</p>
	</blockquote>
</figure>
`.trim()
		);
	});

	test('omit (non japanese)', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
> quote1
>
>~
>
> quote2
>- ?en
`
				)
			)
		).toBe(
			`
<figure>
	<blockquote class="p-quote" lang="en">
		<p>quote1</p>
		<p><b class="p-quote__omit" lang="ja">(中略)</b></p>
		<p>quote2</p>
	</blockquote>
</figure>
`.trim()
		);
	});

	test('meta text', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
> quote
>
>- ?引用元
`
				)
			)
		).toBe(
			`
<figure>
	<blockquote class="p-quote"><p>quote</p></blockquote>
	<figcaption class="c-caption -meta">引用元</figcaption>
</figure>
`.trim()
		);
	});

	test('meta lang', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
> quote
>
>- ?en
`
				)
			)
		).toBe(
			`
<figure>
	<blockquote class="p-quote" lang="en"><p>quote</p></blockquote>
</figure>
`.trim()
		);
	});

	test('meta url', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
> quote
>
>- ?http://example.com
`
				)
			)
		).toBe(
			`
<figure>
	<blockquote class="p-quote" cite="http://example.com"><p>quote</p></blockquote>
</figure>
`.trim()
		);
	});

	test('meta isbn', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
> quote
>
>- ?978-4-06-519981-7
`
				)
			)
		).toBe(
			`
<figure>
	<blockquote class="p-quote" cite="urn:ISBN:978-4-06-519981-7"><p>quote</p></blockquote>
</figure>
`.trim()
		);
	});

	test('meta isbn (invalid)', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
> quote
>
>- ?978-4-06-519981-0
`
				)
			)
		).toBe(
			`
<figure>
	<blockquote class="p-quote"><p>quote</p></blockquote>
</figure>
`.trim()
		);
	});

	test('meta all', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
> quote
>
>- ?en
>- ?978-4-06-519981-7
>- ?http://example.com
>- ?*引用*元
`
				)
			)
		).toBe(
			`
<figure>
	<blockquote class="p-quote" lang="en" cite="http://example.com"><p>quote</p></blockquote>
	<figcaption class="c-caption -meta"><a href="http://example.com">引用元</a><b class="c-domain">(example.com)</b></figcaption>
</figure>
`.trim()
		);
	});
});

describe('code', () => {
	test('single line', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
\`\`\`
code1
\`\`\`
`
				)
			)
		).toBe(
			`
<div class="p-code">
	<pre class="p-code__code"><code id="code-608b37cf873ae12ce9d2169eeb9f1359">code1</code></pre>
</div>
`.trim()
		);
	});

	test('multi line', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
\`\`\`
code1
code*2*
\`\`\`
`
				)
			)
		).toBe(
			`
<div class="p-code">
	<div class="p-code__clipboard">
		<button type="button" is="w0s-clipboard" class="p-code__clipboard-button" data-target-for="code-3247df396b0e96d79af9ae67b7500fea"><img src="/image/entry/copy.svg" alt="コピー" /></button>
	</div>
	<pre class="p-code__code"><code id="code-3247df396b0e96d79af9ae67b7500fea">code1
code*2*</code></pre>
</div>
`.trim()
		);
	});

	test('lang', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
\`\`\`html
<p>code1</p>
<p>code*2*</p>
\`\`\`
`
				)
			)
		).toBe(
			`
<div class="p-code">
	<div class="p-code__clipboard">
		<button type="button" is="w0s-clipboard" class="p-code__clipboard-button" data-target-for="code-e29e42be83cd7ab3e69a92ec404915c8"><img src="/image/entry/copy.svg" alt="コピー" /></button>
	</div>
	<pre class="p-code__code"><code id="code-e29e42be83cd7ab3e69a92ec404915c8" class="hljs lang-html"><span class="hljs-tag">&lt;<span class="hljs-name">p</span>></span>code1<span class="hljs-tag">&lt;/<span class="hljs-name">p</span>></span>
<span class="hljs-tag">&lt;<span class="hljs-name">p</span>></span>code*2*<span class="hljs-tag">&lt;/<span class="hljs-name">p</span>></span></code></pre>
</div>
`.trim()
		);
	});
});

describe('table', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
| th | *th* | th | th |
| - | :- | -: | :-: |
| td | *td* | td | td |
| td | td | td | td |
`
				)
			)
		).toBe(
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
`.trim()
		);
	});

	test('first row header', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
| ~th | th |
| - | - |
| th | td |
| th | td |
`
				)
			)
		).toBe(
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
`.trim()
		);
	});

	test('no thead', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
| td | td |
| td | td |
`
				)
			)
		).toBe(
			`
<p>| td | td | | td | td |</p>
`.trim()
		);
	});
});

describe('box', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
:::normal
text1
:::
`
				)
			)
		).toBe(
			`
<div class="p-box -normal"><p>text1</p></div>
`.trim()
		);
	});

	test('multi line', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
:::normal
text1

text*2*
:::
`
				)
			)
		).toBe(
			`
<div class="p-box -normal">
	<p>text1</p>
	<p>text<em>2</em></p>
</div>
`.trim()
		);
	});

	test('last child no text', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
:::normal
text1

text*2*

:::
`
				)
			)
		).toBe(
			`
<div class="p-box -normal">
	<p>text1</p>
	<p>text<em>2</em></p>
</div>
`.trim()
		);
	});

	test('& > :not(p)', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
:::normal
text1

- list

:::
`
				)
			)
		).toBe(
			`
<div class="p-box -normal">
	<p>text1</p>
	<ul class="p-list">
		<li>list</li>
	</ul>
</div>
`.trim()
		);
	});

	test('no name', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
:::
text1

text*2*
:::
`
				)
			)
		).toBe(
			`
<p>::: text1</p>
<p>text<em>2</em> :::</p>
`.trim()
		);
	});

	test('no close', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
:::normal
text1
`
				)
			)
		).toBe(
			`
<p>:::normal text1</p>
`.trim()
		);
	});
});

describe('Image', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@file.jpg: title<title> title
`
				)
			)
		).toBe(
			`
<div class="c-flex">
	<figure class="c-flex__item">
		<div class="p-embed">
			<a href="https://media.w0s.jp/image/blog/file.jpg"
				><picture
					><source type="image/avif" srcset="https://media.w0s.jp/thumbimage/blog/file.jpg?type=avif;w=360;h=360;quality=60, https://media.w0s.jp/thumbimage/blog/file.jpg?type=avif;w=720;h=720;quality=30 2x" />
					<source type="image/webp" srcset="https://media.w0s.jp/thumbimage/blog/file.jpg?type=webp;w=360;h=360;quality=60, https://media.w0s.jp/thumbimage/blog/file.jpg?type=webp;w=720;h=720;quality=30 2x" />
					<img src="https://media.w0s.jp/thumbimage/blog/file.jpg?type=jpeg;w=360;h=360;quality=60" alt="オリジナル画像" class="p-embed__image" /></picture
			></a>
		</div>
		<figcaption class="c-caption">title&lt;title> title</figcaption>
	</figure>
</div>
`.trim()
		);
	});

	test('multi line', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@file1.jpg: image1
@file2.svg: image2
@file3.mp4: video1
`
				)
			)
		).toBe(
			`
<div class="c-flex">
	<figure class="c-flex__item">
		<div class="p-embed">
			<a href="https://media.w0s.jp/image/blog/file1.jpg"
				><picture
					><source type="image/avif" srcset="https://media.w0s.jp/thumbimage/blog/file1.jpg?type=avif;w=360;h=360;quality=60, https://media.w0s.jp/thumbimage/blog/file1.jpg?type=avif;w=720;h=720;quality=30 2x" />
					<source type="image/webp" srcset="https://media.w0s.jp/thumbimage/blog/file1.jpg?type=webp;w=360;h=360;quality=60, https://media.w0s.jp/thumbimage/blog/file1.jpg?type=webp;w=720;h=720;quality=30 2x" />
					<img src="https://media.w0s.jp/thumbimage/blog/file1.jpg?type=jpeg;w=360;h=360;quality=60" alt="オリジナル画像" class="p-embed__image" /></picture
			></a>
		</div>
		<figcaption class="c-caption">image1</figcaption>
	</figure>
	<figure class="c-flex__item">
		<div class="p-embed"><img src="https://media.w0s.jp/image/blog/file2.svg" alt="" class="p-embed__image" /></div>
		<figcaption class="c-caption">image2</figcaption>
	</figure>
	<figure class="c-flex__item">
		<div class="p-embed"><video src="https://media.w0s.jp/video/blog/file3.mp4" controls class="p-embed__video"></video></div>
		<figcaption class="c-caption">video1</figcaption>
	</figure>
</div>
`.trim()
		);
	});

	test('no separator', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@file.jpg title
`
				)
			)
		).toBe(
			`
<p>@file.jpg title</p>
`.trim()
		);
	});

	test('row2 invalid', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@file.jpg: title
file.jpg
`
				)
			)
		).toBe(
			`
<p>@file.jpg: title file.jpg</p>
`.trim()
		);
	});
});

describe('Amazon', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@amazon: 1234567890 title<title> title
`
				)
			)
		).toBe(
			`
<aside class="p-amazon">
	<h2 class="p-amazon__hdg"><img src="/image/entry/amazon-buy.png" srcset="/image/entry/amazon-buy@2x.png 2x" alt="Amazon で買う" width="127" height="26" /></h2>
	<ul class="p-amazon__list">
		<li>
			<a class="p-amazon__link" href="https://www.amazon.co.jp/dp/1234567890/ref=nosim?tag=w0s.jp-22"
				><div class="p-amazon__thumb">
					<img src="/image/entry/amazon-noimage.svg" alt="" width="113" height="160" class="p-amazon__image" />
					<div class="p-amazon__text"><p class="p-amazon__title">title&lt;title> title</p></div>
				</div></a
			>
		</li>
	</ul>
</aside>
`.trim()
		);
	});

	test('image', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@amazon: 1234567890 title<title> title <abcdef>
`
				)
			)
		).toBe(
			`
<aside class="p-amazon">
	<h2 class="p-amazon__hdg"><img src="/image/entry/amazon-buy.png" srcset="/image/entry/amazon-buy@2x.png 2x" alt="Amazon で買う" width="127" height="26" /></h2>
	<ul class="p-amazon__list">
		<li>
			<a class="p-amazon__link" href="https://www.amazon.co.jp/dp/1234567890/ref=nosim?tag=w0s.jp-22"
				><div class="p-amazon__thumb">
					<img src="https://m.media-amazon.com/images/I/abcdef._SL160_.jpg" srcset="https://m.media-amazon.com/images/I/abcdef._SL320_.jpg 2x" alt="" class="p-amazon__image" />
					<div class="p-amazon__text"><p class="p-amazon__title">title&lt;title> title</p></div>
				</div></a
			>
		</li>
	</ul>
</aside>
`.trim()
		);
	});

	test('image size', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@amazon: 1234567890 title <abcdef 99x150>
`
				)
			)
		).toBe(
			`
<aside class="p-amazon">
	<h2 class="p-amazon__hdg"><img src="/image/entry/amazon-buy.png" srcset="/image/entry/amazon-buy@2x.png 2x" alt="Amazon で買う" width="127" height="26" /></h2>
	<ul class="p-amazon__list">
		<li>
			<a class="p-amazon__link" href="https://www.amazon.co.jp/dp/1234567890/ref=nosim?tag=w0s.jp-22"
				><div class="p-amazon__thumb">
					<img src="https://m.media-amazon.com/images/I/abcdef._SL160_.jpg" srcset="https://m.media-amazon.com/images/I/abcdef._SL320_.jpg 2x" alt="" width="106" height="160" class="p-amazon__image" />
					<div class="p-amazon__text"><p class="p-amazon__title">title</p></div>
				</div></a
			>
		</li>
	</ul>
</aside>
`.trim()
		);
	});

	test('asin invalid', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@amazon: 1234 title
`
				)
			)
		).toBe(
			`
<p>@amazon: 1234 title</p>
`.trim()
		);
	});

	test('multi invalid', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@amazon: 1234567890 title
@youtube: 1234567890 title
`
				)
			)
		).toBe(
			`
<p>@amazon: 1234567890 title @youtube: 1234567890 title</p>
`.trim()
		);
	});
});

describe('YouTube', () => {
	test('normal', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@youtube: 1234567890 title<title> title
`
				)
			)
		).toBe(
			`
<figure>
	<div class="p-embed">
		<iframe src="https://www.youtube-nocookie.com/embed/1234567890?cc_load_policy=1" allow="encrypted-media;fullscreen;gyroscope;picture-in-picture" title="YouTube 動画" width="560" height="315" class="p-embed__frame" style="--aspect-ratio: 560/315"></iframe>
		<figcaption class="c-caption"><a href="https://www.youtube.com/watch?v=1234567890">title&lt;title> title</a><img src="/image/icon/youtube.svg" alt="(YouTube)" width="16" height="16" class="c-link-icon" /></figcaption>
	</div>
</figure>
`.trim()
		);
	});

	test('size', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@youtube: 1234567890 title<title> title <100x150>
`
				)
			)
		).toBe(
			`
<figure>
	<div class="p-embed">
		<iframe src="https://www.youtube-nocookie.com/embed/1234567890?cc_load_policy=1" allow="encrypted-media;fullscreen;gyroscope;picture-in-picture" title="YouTube 動画" width="100" height="150" class="p-embed__frame" style="--aspect-ratio: 100/150"></iframe>
		<figcaption class="c-caption"><a href="https://www.youtube.com/watch?v=1234567890">title&lt;title> title</a><img src="/image/icon/youtube.svg" alt="(YouTube)" width="16" height="16" class="c-link-icon" /></figcaption>
	</div>
</figure>
`.trim()
		);
	});

	test('start', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@youtube: 1234567890 title <10>
`
				)
			)
		).toBe(
			`
<figure>
	<div class="p-embed">
		<iframe src="https://www.youtube-nocookie.com/embed/1234567890?cc_load_policy=1&amp;start=10" allow="encrypted-media;fullscreen;gyroscope;picture-in-picture" title="YouTube 動画" width="560" height="315" class="p-embed__frame" style="--aspect-ratio: 560/315"></iframe>
		<figcaption class="c-caption"><a href="https://www.youtube.com/watch?v=1234567890&amp;t=10s">title</a><img src="/image/icon/youtube.svg" alt="(YouTube)" width="16" height="16" class="c-link-icon" /></figcaption>
	</div>
</figure>
`.trim()
		);
	});

	test('size & start', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@youtube: 1234567890 title <100x150 10>
`
				)
			)
		).toBe(
			`
<figure>
	<div class="p-embed">
		<iframe src="https://www.youtube-nocookie.com/embed/1234567890?cc_load_policy=1&amp;start=10" allow="encrypted-media;fullscreen;gyroscope;picture-in-picture" title="YouTube 動画" width="100" height="150" class="p-embed__frame" style="--aspect-ratio: 100/150"></iframe>
		<figcaption class="c-caption"><a href="https://www.youtube.com/watch?v=1234567890&amp;t=10s">title</a><img src="/image/icon/youtube.svg" alt="(YouTube)" width="16" height="16" class="c-link-icon" /></figcaption>
	</div>
</figure>
`.trim()
		);
	});

	test('id invalid', async () => {
		const markdown = new Markdown();
		expect(
			format(
				await markdown.toHtml(
					`
@youtube: aaa@
`
				)
			)
		).toBe(
			`
<p>@youtube: aaa@</p>
`.trim()
		);
	});
});
