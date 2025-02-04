export default {
	template: 'sns/misskey.ejs',
	visibility: 'public', // https://misskey.noellabo.jp/api-doc#tag/notes/POST/notes/create
	processMessage: {
		success: 'Misskey 投稿に成功',
		failure: 'Misskey 投稿に失敗',
	},
};
