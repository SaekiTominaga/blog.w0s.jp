export default {
	path: 'feed.atom',
	template: 'feed/atom.ejs',
	limit: 10,
	processMessage: {
		success: 'フィード生成に成功',
		failure: 'フィード生成に失敗',
	},
};
