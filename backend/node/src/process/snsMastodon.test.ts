import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import post from './snsMastodon.js';

await test('minimum properties', async () => {
	const result = await post({
		url: 'http://exaple.com/entry/1',
		title: 'タイトル',
		description: null,
		tags: null,
	});

	assert.equal(/https:\/\/fedibird.com\/@SaekiTominaga\/[0-9]+/.test(result.url), true);
	assert.equal(
		result.content,
		`<p>ブログ書いた。</p><p>タイトル <a href="http://exaple.com/entry/1" rel="nofollow noopener noreferrer" target="_blank"><span class="invisible">http://</span><span class="">exaple.com/entry/1</span><span class="invisible"></span></a></p>`,
	);
});

await test('all properties', async () => {
	const result = await post({
		url: 'http://exaple.com/entry/1',
		title: 'タイトル<>"\'',
		description: '詳細<>"\'',
		tags: ['タグ1', 'タグ2<>"\'', ''],
	});

	assert.equal(/https:\/\/fedibird\.com\/@SaekiTominaga\/[0-9]+/.test(result.url), true);
	assert.equal(
		result.content,
		`<p>ブログ書いた。</p><p>タイトル&lt;&gt;&quot;&apos; <a href="http://exaple.com/entry/1" rel="nofollow noopener noreferrer" target="_blank"><span class="invisible">http://</span><span class="">exaple.com/entry/1</span><span class="invisible"></span></a></p><p>詳細&lt;&gt;&quot;&apos;</p><p><a href="https://fedibird.com/tags/%E3%82%BF%E3%82%B01" class="mention hashtag" rel="tag">#<span>タグ1</span></a> <a href="https://fedibird.com/tags/%E3%82%BF%E3%82%B02" class="mention hashtag" rel="tag">#<span>タグ2</span></a>&lt;&gt;&quot;&apos;</p>`,
	);
});
