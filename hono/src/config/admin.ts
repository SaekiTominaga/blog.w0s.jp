export default {
	template: 'admin.ejs',
	validator: {
		entryNotFound: '記事が存在しません。',
		titleUnique: '他の記事で使用されているタイトルです。',
	},
	processMessage: {
		insert: {
			success: '記事の投稿に成功',
		},
		update: {
			success: '記事の更新に成功',
		},
	},
};
