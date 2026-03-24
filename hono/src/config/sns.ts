export default {
	mastodon: {
		template: 'sns/mastodon.ejs',
		visibility: 'public' as 'public' | 'unlisted' | 'private' | 'direct', // https://docs.joinmastodon.org/entities/Status/#visibility
		processMessage: {
			success: 'Mastodon 投稿に成功',
			failure: 'Mastodon 投稿に失敗',
		},
	},
	bluesky: {
		template: 'sns/bluesky.ejs',
		processMessage: {
			success: 'Bluesky 投稿に成功',
			failure: 'Bluesky 投稿に失敗',
		},
	},
	misskey: {
		template: 'sns/misskey.ejs',
		visibility: 'public', // https://misskey.noellabo.jp/api-doc#tag/notes/POST/notes/create
		processMessage: {
			success: 'Misskey 投稿に成功',
			failure: 'Misskey 投稿に失敗',
		},
	},
};
