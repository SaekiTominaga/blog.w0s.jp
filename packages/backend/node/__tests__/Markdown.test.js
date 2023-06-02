import fs from 'node:fs';
import { describe, expect, test } from '@jest/globals';
import BlogDao from '../dist/dao/BlogDao.js';
import Markdown from '../dist/markdown/Markdown.js';

const config = JSON.parse(await fs.promises.readFile('configure/common.json', 'utf8'));
const dbh = await new BlogDao(config).getDbh();

describe('block', () => {
	test('p', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
text1
text2
`)
		).toBe('<p>text1</p><p>text2</p>');
	});

	test('ul', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
- list1
- list2
`)
		).toBe('<ul class="p-list"><li>list1</li><li>list2</li></ul>');
	});

	test('link list', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
-- list1
-- list2
`)
		).toBe('<ul class="p-links"><li>list1</li><li>list2</li></ul>');
	});

	test('-', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
-text
`)
		).toBe('<p>-text</p>');
	});

	test('ol', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
1. list1
1. list2
`)
		).toBe('<ol class="p-list-num"><li>list1</li><li>list2</li></ol>');
	});

	test('1', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
1text
`)
		).toBe('<p>1text</p>');
	});

	test('dl', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
: dt1 | dd1
: \`dt2\` | [dd2](http://example.com)
`)
		).toBe(
			'<dl class="p-list-description"><dt>dt1</dt><dd>dd1</dd><dt><code>dt2</code></dt><dd><a href="http://example.com">dd2</a><b class="c-domain">(example.com)</b></dd></dl>'
		);
	});

	test(':', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
:text
`)
		).toBe('<p>:text</p>');
	});

	test('note', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
* note1
* note2
`)
		).toBe('<ul class="p-notes"><li>note1</li><li>note2</li></ul>');
	});

	test('insert', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
*2022-01-01: insert1
*2022-01-01: insert2
`)
		).toBe(
			'<p class="p-insert"><span class="p-insert__date">2022年1月1日追記</span><ins datetime="2022-01-01" class="p-insert__text">insert1</ins></p><p class="p-insert"><span class="p-insert__date">2022年1月1日追記</span><ins datetime="2022-01-01" class="p-insert__text">insert2</ins></p>'
		);
	});

	test('*', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
*text
`)
		).toBe('<p>*text</p>');
	});

	test('blockquote', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
> text1
>
> text2
`)
		).toBe('<figure><blockquote class="p-quote"><p>text1</p><p><b class="p-quote__omit">(中略)</b></p><p>text2</p></blockquote></figure>');
	});

	test('blockquote - cite', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
> text1
> text2
?cite
`)
		).toBe(
			'<figure><blockquote class="p-quote"><p>text1</p><p>text2</p></blockquote><figcaption class="c-caption -meta"><span class="c-caption__title">cite</span></figcaption></figure>'
		);
	});

	test('blockquote - cite - URL', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
> text1
> text2
?en
?cite
?https://example.com/foo.pdf
`)
		).toBe(
			'<figure><blockquote class="p-quote" lang="en" cite="https://example.com/foo.pdf"><p>text1</p><p>text2</p></blockquote><figcaption class="c-caption -meta"><span class="c-caption__title"><a href="https://example.com/foo.pdf">cite</a><img src="/image/icon/pdf.png" alt="(PDF)" width="16" height="16" class="c-link-icon"><b class="c-domain">(example.com)</b></span></figcaption></figure>'
		);
	});

	test('blockquote - cite - ISBN', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
> text1
> text2
?en
?cite
?978-4-06-519981-7
`)
		).toBe(
			'<figure><blockquote class="p-quote" lang="en" cite="urn:ISBN:978-4-06-519981-7"><p>text1</p><p>text2</p></blockquote><figcaption class="c-caption -meta"><span class="c-caption__title">cite</span></figcaption></figure>'
		);
	});

	test('blockquote - cite - ISBN - invalid check digit', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
> text1
> text2
?en
?cite
?978-4-06-519981-0
`)
		).toBe(
			'<figure><blockquote class="p-quote" lang="en"><p>text1</p><p>text2</p></blockquote><figcaption class="c-caption -meta"><span class="c-caption__title">cite</span></figcaption></figure>'
		);
	});

	test('>', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
>text
`)
		).toBe('<p>&gt;text</p>');
	});

	test('?', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
?text
`)
		).toBe('<p>?text</p>');
	});

	test('code', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
\`\`\`
code1
code2
\`\`\`
`)
		)
			.toBe(`<div class="p-code"><div class="p-code__clipboard"><button type="button" is="w0s-clipboard" data-target-for="code-d58f8080245fe003007620661b93d2a9" class="p-code__clipboard-button"><img src="/image/entry/copy.svg" alt="コピー"></button></div><pre class="p-code__code"><code id="code-d58f8080245fe003007620661b93d2a9">code1
code2</code></pre></div>`);
	});

	test('code - lang - html', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
\`\`\`html
code1
code2
\`\`\`
`)
		)
			.toBe(`<div class="p-code"><div class="p-code__clipboard"><button type="button" is="w0s-clipboard" data-target-for="code-d58f8080245fe003007620661b93d2a9" class="p-code__clipboard-button"><img src="/image/entry/copy.svg" alt="コピー"></button></div><pre class="p-code__code"><code id="code-d58f8080245fe003007620661b93d2a9" data-language="html">code1
code2</code></pre></div>`);
	});

	test('code - lang - css', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
\`\`\`css
code1
code2
\`\`\`
`)
		)
			.toBe(`<div class="p-code"><div class="p-code__clipboard"><button type="button" is="w0s-clipboard" data-target-for="code-d58f8080245fe003007620661b93d2a9" class="p-code__clipboard-button"><img src="/image/entry/copy.svg" alt="コピー"></button></div><pre class="p-code__code"><code id="code-d58f8080245fe003007620661b93d2a9" data-language="css">code1
code2</code></pre></div>`);
	});

	test('code - lang - javascript', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
\`\`\`javascript
code1
code2
\`\`\`
`)
		)
			.toBe(`<div class="p-code"><div class="p-code__clipboard"><button type="button" is="w0s-clipboard" data-target-for="code-d58f8080245fe003007620661b93d2a9" class="p-code__clipboard-button"><img src="/image/entry/copy.svg" alt="コピー"></button></div><pre class="p-code__code"><code id="code-d58f8080245fe003007620661b93d2a9" data-language="javascript">code1
code2</code></pre></div>`);
	});

	test('code - lang - typescript', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
\`\`\`typescript
code1
code2
\`\`\`
`)
		)
			.toBe(`<div class="p-code"><div class="p-code__clipboard"><button type="button" is="w0s-clipboard" data-target-for="code-d58f8080245fe003007620661b93d2a9" class="p-code__clipboard-button"><img src="/image/entry/copy.svg" alt="コピー"></button></div><pre class="p-code__code"><code id="code-d58f8080245fe003007620661b93d2a9" data-language="typescript">code1
code2</code></pre></div>`);
	});

	test('code - lang - json', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
\`\`\`json
code1
code2
\`\`\`
`)
		)
			.toBe(`<div class="p-code"><div class="p-code__clipboard"><button type="button" is="w0s-clipboard" data-target-for="code-d58f8080245fe003007620661b93d2a9" class="p-code__clipboard-button"><img src="/image/entry/copy.svg" alt="コピー"></button></div><pre class="p-code__code"><code id="code-d58f8080245fe003007620661b93d2a9" data-language="json">code1
code2</code></pre></div>`);
	});

	test('code - lang - invalid', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
\`\`\`xxx
code1
code2
\`\`\`
`)
		)
			.toBe(`<div class="p-code"><div class="p-code__clipboard"><button type="button" is="w0s-clipboard" data-target-for="code-d58f8080245fe003007620661b93d2a9" class="p-code__clipboard-button"><img src="/image/entry/copy.svg" alt="コピー"></button></div><pre class="p-code__code"><code id="code-d58f8080245fe003007620661b93d2a9" data-language="xxx">code1
code2</code></pre></div>`);
	});

	test('code - no close', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
\`\`\`
code
`)
		)
			.toBe(`<div class="p-code"><div class="p-code__clipboard"><button type="button" is="w0s-clipboard" data-target-for="code-7844a93ad4b97169834dade975b5beff" class="p-code__clipboard-button"><img src="/image/entry/copy.svg" alt="コピー"></button></div><pre class="p-code__code"><code id="code-7844a93ad4b97169834dade975b5beff">code
</code></pre></div>`);
	});

	test('`', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
\`text
`)
		).toBe('<p>`text</p>');
	});

	test('table', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
| th1 | th2 |
| - | - |
|~ th1-1 | td1-2 |
| td2-1 | td2-2 |
`)
		).toBe(
			'<table class="p-table"><thead><tr><th scope="col">th1</th><th scope="col">th2</th></tr></thead><tbody><tr><th scope="row">th1-1</th><td>td1-2</td></tr><tr><td>td2-1</td><td>td2-2</td></tr></tbody></table>'
		);
	});

	test('|', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
|text
`)
		).toBe('<p>|text</p>');
	});

	test('box', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
/ text1
/ text2
`)
		).toBe('<div class="p-box"><p>text1</p><p>text2</p></div>');
	});

	test('/', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
/text
`)
		).toBe('<p>/text</p>');
	});

	test('media', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
!foo.jpg caption1\`code\`
!bar.svg caption2\`code\`
!baz.mp4 caption3\`code\`
`)
		).toBe(
			'<div class="c-flex"><figure class="c-flex__item"><div class="p-embed"><a href="https://media.w0s.jp/image/blog/foo.jpg"><picture><source type="image/avif" srcset="https://media.w0s.jp/thumbimage/blog/foo.jpg?type=avif;w=360;h=360;quality=60, https://media.w0s.jp/thumbimage/blog/foo.jpg?type=avif;w=720;h=720;quality=30 2x"><source type="image/webp" srcset="https://media.w0s.jp/thumbimage/blog/foo.jpg?type=webp;w=360;h=360;quality=60, https://media.w0s.jp/thumbimage/blog/foo.jpg?type=webp;w=720;h=720;quality=30 2x"><img src="https://media.w0s.jp/thumbimage/blog/foo.jpg?type=jpeg;w=360;h=360;quality=60" alt="オリジナル画像" class="p-embed__image"></picture></a></div><figcaption class="c-caption"><span class="c-caption__no">画像1</span><span class="c-caption__title">caption1<code>code</code></span></figcaption></figure><figure class="c-flex__item"><div class="p-embed"><img src="https://media.w0s.jp/image/blog/bar.svg" alt="" class="p-embed__image"></div><figcaption class="c-caption"><span class="c-caption__no">画像2</span><span class="c-caption__title">caption2<code>code</code></span></figcaption></figure><figure class="c-flex__item"><div class="p-embed"><video src="https://media.w0s.jp/video/blog/baz.mp4" controls="" class="p-embed__video"></video></div><figcaption class="c-caption"><span class="c-caption__no">動画1</span><span class="c-caption__title">caption3<code>code</code></span></figcaption></figure></div>'
		);
	});

	test('YouTube', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
!youtube:HJxspEKHqCs caption
`)
		).toBe(
			'<figure><div class="p-embed"><iframe src="https://www.youtube-nocookie.com/embed/HJxspEKHqCs?cc_load_policy=1" allow="encrypted-media;fullscreen;gyroscope;picture-in-picture" title="YouTube 動画" width="560" height="315" class="p-embed__frame" style="--aspect-ratio:560/315"></iframe></div><figcaption class="c-caption"><span class="c-caption__no">動画1</span><span class="c-caption__title"><a href="https://www.youtube.com/watch?v=HJxspEKHqCs">caption</a><img src="/image/icon/youtube.svg" alt="(YouTube)" width="16" height="16" class="c-link-icon"></span></figcaption></figure>'
		);
	});

	test('YouTube - meta', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
!youtube:HJxspEKHqCs caption <640x480 10>
`)
		).toBe(
			'<figure><div class="p-embed"><iframe src="https://www.youtube-nocookie.com/embed/HJxspEKHqCs?cc_load_policy=1&amp;start=10" allow="encrypted-media;fullscreen;gyroscope;picture-in-picture" title="YouTube 動画" width="640" height="480" class="p-embed__frame" style="--aspect-ratio:640/480"></iframe></div><figcaption class="c-caption"><span class="c-caption__no">動画1</span><span class="c-caption__title"><a href="https://www.youtube.com/watch?v=HJxspEKHqCs&amp;t=10s">caption</a><img src="/image/icon/youtube.svg" alt="(YouTube)" width="16" height="16" class="c-link-icon"></span></figcaption></figure>'
		);
	});

	test('!', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
!text
`)
		).toBe('<p>!text</p>');
	});

	test('Tweet', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
text1
$tweet: 1511319225541210113 1530514683383672832
text2
`)
		)
			.toBe(`<p>text1</p><div class="c-flex"><figure class="c-flex__item"><div class="p-embed"><blockquote class="p-embed__tweet twitter-tweet" data-dnt="true"><p>等々力駅到着時の自動放送、「東京都市大学、等々力キャンパス最寄り駅です。」部分の削除対応で終わりと思いきや、まさか削除の数日後に差し替え新録の追加があるとは。
（2022年4月5日 112-192レ 普通大井町 9012F、※写真は当該列車ではありません） https://t.co/KxSFieBGGX</p><a href="https://twitter.com/SaekiTominaga/status/1511319225541210113">— トミー (@SaekiTominaga) 2022年4月5日 21:25</a></blockquote></div><figcaption class="c-caption"><span class="c-caption__title"><a href="https://twitter.com/SaekiTominaga/status/1511319225541210113">トミー (@SaekiTominaga) 2022年4月5日 21:25</a><img src="/image/icon/twitter.svg" alt="(Twitter)" width="16" height="16" class="c-link-icon"></span></figcaption></figure><figure class="c-flex__item"><div class="p-embed"><blockquote class="p-embed__tweet twitter-tweet" data-dnt="true"><p>村野監督のこだわりポイントで言えば、私が感服したのはこれ。（劇場限定版Blu-ray特典の絵コンテ集より） #R指定アニメ #かくしごと #at_x https://t.co/vi9UtiZDmb</p><a href="https://twitter.com/SaekiTominaga/status/1530514683383672832">— トミー (@SaekiTominaga) 2022年5月28日 20:41</a></blockquote></div><figcaption class="c-caption"><span class="c-caption__title"><a href="https://twitter.com/SaekiTominaga/status/1530514683383672832">トミー (@SaekiTominaga) 2022年5月28日 20:41</a><img src="/image/icon/twitter.svg" alt="(Twitter)" width="16" height="16" class="c-link-icon"></span></figcaption></figure></div><p>text2</p>`);
	});

	test('Amazon', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
text1
$amazon: B01GRDKGZW 4091220754
text2
`)
		).toBe(
			'<p>text1</p><aside class="p-amazon"><h2 class="p-amazon__hdg"><img src="/image/entry/amazon-buy.png" srcset="/image/entry/amazon-buy@2x.png 2x" alt="Amazon で買う" width="127" height="26"></h2><ul class="p-amazon__list"><li><a class="p-amazon__link" href="https://www.amazon.co.jp/dp/B01GRDKGZW?tag=w0s.jp-22&amp;linkCode=ogi&amp;th=1&amp;psc=1"><div class="p-amazon__thumb"><img src="https://m.media-amazon.com/images/I/51W2ihWPntL._SL160_.jpg" srcset="https://m.media-amazon.com/images/I/51W2ihWPntL._SL320_.jpg 2x" alt="" class="p-amazon__image"></div><div class="p-amazon__text"><p class="p-amazon__title">かくしごと（１） (月刊少年マガジンコミックス)<b class="c-amazon-binding">Kindle版</b></p><p class="p-amazon__date">2016年6月17日 発売</p></div></a></li><li><a class="p-amazon__link" href="https://www.amazon.co.jp/dp/4091220754?tag=w0s.jp-22&amp;linkCode=ogi&amp;th=1&amp;psc=1"><div class="p-amazon__thumb"><img src="https://m.media-amazon.com/images/I/31sMkfmj8NL._SL160_.jpg" srcset="https://m.media-amazon.com/images/I/31sMkfmj8NL._SL320_.jpg 2x" alt="" class="p-amazon__image"></div><div class="p-amazon__text"><p class="p-amazon__title">かってに改蔵〔新装版〕 (1) (少年サンデーコミックススペシャル)<b class="c-amazon-binding">コミック</b></p><p class="p-amazon__date">2010年4月16日 発売</p></div></a></li></ul></aside><p>text2</p>'
		);
	});

	test('Amazon - <h3>', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
text1
# heading
$amazon: B01GRDKGZW
text2
`)
		).toBe(
			'<p>text1</p><section class="p-entry-section -hdg1" id="section-heading"><div class="p-entry-section__hdg"><h2>heading</h2><p class="p-entry-section__self-link"><a href="#section-heading" class="c-self-link">§</a></p></div><aside class="p-amazon"><h3 class="p-amazon__hdg"><img src="/image/entry/amazon-buy.png" srcset="/image/entry/amazon-buy@2x.png 2x" alt="Amazon で買う" width="127" height="26"></h3><ul class="p-amazon__list"><li><a class="p-amazon__link" href="https://www.amazon.co.jp/dp/B01GRDKGZW?tag=w0s.jp-22&amp;linkCode=ogi&amp;th=1&amp;psc=1"><div class="p-amazon__thumb"><img src="https://m.media-amazon.com/images/I/51W2ihWPntL._SL160_.jpg" srcset="https://m.media-amazon.com/images/I/51W2ihWPntL._SL320_.jpg 2x" alt="" class="p-amazon__image"></div><div class="p-amazon__text"><p class="p-amazon__title">かくしごと（１） (月刊少年マガジンコミックス)<b class="c-amazon-binding">Kindle版</b></p><p class="p-amazon__date">2016年6月17日 発売</p></div></a></li></ul></aside><p>text2</p></section>'
		);
	});

	test('Amazon - <h4>', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
text1
# heading
## heading
$amazon: B01GRDKGZW
text2
`)
		).toBe(
			'<p>text1</p><section class="p-entry-section -hdg1" id="section-heading"><div class="p-entry-section__hdg"><h2>heading</h2><p class="p-entry-section__self-link"><a href="#section-heading" class="c-self-link">§</a></p></div><section class="p-entry-section -hdg2" id="section-heading-1"><div class="p-entry-section__hdg"><h3>heading</h3><p class="p-entry-section__self-link"><a href="#section-heading-1" class="c-self-link">§</a></p></div><aside class="p-amazon"><h4 class="p-amazon__hdg"><img src="/image/entry/amazon-buy.png" srcset="/image/entry/amazon-buy@2x.png 2x" alt="Amazon で買う" width="127" height="26"></h4><ul class="p-amazon__list"><li><a class="p-amazon__link" href="https://www.amazon.co.jp/dp/B01GRDKGZW?tag=w0s.jp-22&amp;linkCode=ogi&amp;th=1&amp;psc=1"><div class="p-amazon__thumb"><img src="https://m.media-amazon.com/images/I/51W2ihWPntL._SL160_.jpg" srcset="https://m.media-amazon.com/images/I/51W2ihWPntL._SL320_.jpg 2x" alt="" class="p-amazon__image"></div><div class="p-amazon__text"><p class="p-amazon__title">かくしごと（１） (月刊少年マガジンコミックス)<b class="c-amazon-binding">Kindle版</b></p><p class="p-amazon__date">2016年6月17日 発売</p></div></a></li></ul></aside><p>text2</p></section></section>'
		);
	});

	test('$', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
$text
`)
		).toBe('<p>$text</p>');
	});
});

describe('inline', () => {
	test('empty', async () => {
		expect(await new Markdown({ config: config, dbh: dbh }).toHtml('- ')).toBe('<ul class="p-list"><li></li></ul>');
	});

	test('all', async () => {
		expect(
			await new Markdown(config).toHtml(
				'<s>text</s>[link<s>link</s>](https://example.com/)**em<s>em</s>**`code<s>code</s>`{{quote<s>quote</s>}}((footnote<s>footnote</s>))<s>text</s>'
			)
		).toBe(
			'<p>&lt;s&gt;text&lt;/s&gt;<a href="https://example.com/">link&lt;s&gt;link&lt;/s&gt;</a><b class="c-domain">(example.com)</b><em>em&lt;s&gt;em&lt;/s&gt;</em><code>code&lt;s&gt;code&lt;/s&gt;</code><q>quote&lt;s&gt;quote&lt;/s&gt;</q><span class="c-annotate"><a href="#fn1" id="nt1" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[1]</a></span>&lt;s&gt;text&lt;/s&gt;</p><ul class="p-footnotes"><li><span class="p-footnotes__no"><a href="#nt1">[1]</a></span><span class="p-footnotes__text" id="fn1">footnote&lt;s&gt;footnote&lt;/s&gt;</span></li></ul>'
		);
	});
});

describe('section', () => {
	test('section1', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
# heading1
text1
`)
		).toBe(
			'<section class="p-entry-section -hdg1" id="section-heading1"><div class="p-entry-section__hdg"><h2>heading1</h2><p class="p-entry-section__self-link"><a href="#section-heading1" class="c-self-link">§</a></p></div><p>text1</p></section>'
		);
	});

	test('section1 - hr', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
# heading1
text1
#
text2
`)
		).toBe(
			'<section class="p-entry-section -hdg1" id="section-heading1"><div class="p-entry-section__hdg"><h2>heading1</h2><p class="p-entry-section__self-link"><a href="#section-heading1" class="c-self-link">§</a></p></div><p>text1</p></section><hr class="p-section-break"><p>text2</p>'
		);
	});

	test('section2', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
# heading1
text1
## heading2
text2
`)
		).toBe(
			'<section class="p-entry-section -hdg1" id="section-heading1"><div class="p-entry-section__hdg"><h2>heading1</h2><p class="p-entry-section__self-link"><a href="#section-heading1" class="c-self-link">§</a></p></div><p>text1</p><section class="p-entry-section -hdg2" id="section-heading2"><div class="p-entry-section__hdg"><h3>heading2</h3><p class="p-entry-section__self-link"><a href="#section-heading2" class="c-self-link">§</a></p></div><p>text2</p></section></section>'
		);
	});

	test('section2 - hr2', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
# heading1
text1
## heading2
text2
##
text3
`)
		).toBe(
			'<section class="p-entry-section -hdg1" id="section-heading1"><div class="p-entry-section__hdg"><h2>heading1</h2><p class="p-entry-section__self-link"><a href="#section-heading1" class="c-self-link">§</a></p></div><p>text1</p><section class="p-entry-section -hdg2" id="section-heading2"><div class="p-entry-section__hdg"><h3>heading2</h3><p class="p-entry-section__self-link"><a href="#section-heading2" class="c-self-link">§</a></p></div><p>text2</p></section><hr class="p-section-break"><p>text3</p></section>'
		);
	});

	test('section2 - hr1', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
# heading1
text1
## heading2
text2
#
text3
`)
		).toBe(
			'<section class="p-entry-section -hdg1" id="section-heading1"><div class="p-entry-section__hdg"><h2>heading1</h2><p class="p-entry-section__self-link"><a href="#section-heading1" class="c-self-link">§</a></p></div><p>text1</p><section class="p-entry-section -hdg2" id="section-heading2"><div class="p-entry-section__hdg"><h3>heading2</h3><p class="p-entry-section__self-link"><a href="#section-heading2" class="c-self-link">§</a></p></div><p>text2</p></section></section><hr class="p-section-break"><p>text3</p>'
		);
	});

	test('toc', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
# heading1
text1
# heading2
text2
`)
		).toBe(
			'<ol aria-label="目次" class="p-toc"><li><a href="#section-heading1">heading1</a></li><li><a href="#section-heading2">heading2</a></li></ol><section class="p-entry-section -hdg1" id="section-heading1"><div class="p-entry-section__hdg"><h2>heading1</h2><p class="p-entry-section__self-link"><a href="#section-heading1" class="c-self-link">§</a></p></div><p>text1</p></section><section class="p-entry-section -hdg1" id="section-heading2"><div class="p-entry-section__hdg"><h2>heading2</h2><p class="p-entry-section__self-link"><a href="#section-heading2" class="c-self-link">§</a></p></div><p>text2</p></section>'
		);
	});

	test('#', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toHtml(`
#text
`)
		).toBe('<p>#text</p>');
	});
});

describe('toXml()', () => {
	test('hr', async () => {
		expect(
			await new Markdown({ config: config, dbh: dbh }).toXml(`
# heading1
#
`)
		).toBe(
			'<section class="p-entry-section -hdg1" id="section-heading1"><div class="p-entry-section__hdg"><h2>heading1</h2><p class="p-entry-section__self-link"><a href="#section-heading1" class="c-self-link">§</a></p></div></section><hr class="p-section-break" />'
		);
	});
});

describe('isTweetExit()', () => {
	test('false', async () => {
		const markdown = new Markdown({ config: config, dbh: dbh });
		await markdown.toHtml('');
		expect(markdown.isTweetExit()).toBeFalsy();
	});

	test('true', async () => {
		const markdown = new Markdown({ config: config, dbh: dbh });
		await markdown.toHtml('$tweet: 1511319225541210113');
		expect(markdown.isTweetExit()).toBeTruthy();
	});
});
