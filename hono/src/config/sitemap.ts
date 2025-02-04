export default {
	path: 'sitemap.xml',
	template: 'xml/sitemap.ejs',
	limit: 50000,
	processMessage: {
		success: 'サイトマップ生成に成功',
		failure: 'サイトマップ生成に失敗',
	},
};
