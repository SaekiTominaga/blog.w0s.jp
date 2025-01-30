export default {
	template: 'post.ejs',
	validator: {
		title: {
			message: {
				unique: '他の記事で使用されているタイトルです。',
			},
		},
	},
	processMessage: {
		insert: {
			success: '記事の投稿に成功',
		},
		update: {
			success: '記事の更新に成功',
		},
		dbModified: {
			success: 'DB 最終更新日時の記録に成功',
			failure: 'DB 最終更新日時の記録に失敗',
		},
		feed: {
			none: 'フィード生成非実施',
			success: 'フィード生成に成功',
			failure: 'フィード生成に失敗',
		},
		sitemap: {
			success: 'サイトマップ生成に成功',
			failure: 'サイトマップ生成に失敗',
		},
		newlyJson: {
			success: '新着 JSON ファイル生成に成功',
			failure: '新着 JSON ファイル生成に失敗',
		},
		mastodon: {
			success: 'Mastodon 投稿に成功',
			failure: 'Mastodon 投稿に失敗',
		},
		bluesky: {
			success: 'Bluesky 投稿に成功',
			failure: 'Bluesky 投稿に失敗',
		},
		misskey: {
			success: 'Misskey 投稿に成功',
			failure: 'Misskey 投稿に失敗',
		},
	},
	mediaUpload: {
		apiResponse: {
			success: {
				code: 1,
				message: 'ファイルアップロードが成功しました。',
			},
			type: {
				code: 11,
				message: '指定されたファイルはサポートされていない種類です。',
			},
			overwrite: {
				code: 12,
				message: '同じファイル名のファイルが既に存在します。',
			},
			size: {
				code: 13,
				message: 'ファイルサイズが大きすぎます。',
			},
			otherMessageFailure: '何らかのエラーが発生しました。',
		},
	},
};
