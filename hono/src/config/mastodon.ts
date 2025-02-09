type VISIBILITY = 'public' | 'unlisted' | 'private' | 'direct';

export default {
	template: 'sns/mastodon.ejs',
	visibility: 'public' as VISIBILITY, // https://docs.joinmastodon.org/entities/Status/#visibility
	processMessage: {
		success: 'Mastodon 投稿に成功',
		failure: 'Mastodon 投稿に失敗',
	},
};
