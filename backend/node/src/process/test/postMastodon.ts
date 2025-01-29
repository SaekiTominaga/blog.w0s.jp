import PostMastodon from '../PostMastodon.js';

const result = await new PostMastodon().execute({
	url: 'http://exaple.com/entry/1',
	title: 'タイトル<>"\'',
	description: '詳細<>"\'',
	tags: ['タグ1', 'タグ2<>"\''],
});
console.debug(result);
