import PostBluesky from '../PostBluesky.js';

const result = await new PostBluesky().execute({
	url: 'http://exaple.com/entry/1',
	title: 'タイトル<>"\'',
	description: '詳細<>"\'',
	tags: ['タグ1', 'タグ2<>"\''],
});
console.debug(result);
