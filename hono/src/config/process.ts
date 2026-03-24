export default {
	post: {
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
	},
	media: {
		image: {
			dir: 'public/entry/image',
			limit: 3072000,
			thumb: {
				dir: 'public/entry/image/thumb',
				dimensions: [
					{ maxWidth: 640, maxHeight: 480 }, // 記事本文
					{ maxWidth: 180, maxHeight: 120 }, // 記事リスト、関連記事
				], // 寸法
				densityQualities: [
					{ density: 1, quality: 60 },
					{ density: 2, quality: 30 },
				], // 密度（1x, 2x, ...）と画質（1–100）の関係値
			},
		},
		video: {
			dir: 'public/entry/video',
			limit: 30720000,
		},
		processMessageUpload: {
			success: 'ファイルアップロードに成功しました。',
			type: '指定されたファイルはサポートされていない種類です。',
			overwrite: '同じ名前のファイルが既に存在します。',
			size: 'ファイルサイズが大きすぎます。',
		},
	},
	dsg: {
		processMessage: {
			success: 'DB 最終更新日時の記録に成功',
			failure: 'DB 最終更新日時の記録に失敗',
		},
	},
	feed: {
		path: 'feed.atom',
		template: 'xml/feed.ejs',
		limit: 10,
		processMessage: {
			success: 'フィード生成に成功',
			failure: 'フィード生成に失敗',
		},
	},
	sitemap: {
		path: 'sitemap.xml',
		template: 'xml/sitemap.ejs',
		limit: 50000,
		processMessage: {
			success: 'サイトマップ生成に成功',
			failure: 'サイトマップ生成に失敗',
		},
	},
	newlyJson: {
		directory: 'json',
		filename: {
			prefix: 'newly',
			separator: '_',
		},
		limit: 10,
		processMessage: {
			success: '新着 JSON ファイル生成に成功',
			failure: '新着 JSON ファイル生成に失敗',
		},
	},
};
