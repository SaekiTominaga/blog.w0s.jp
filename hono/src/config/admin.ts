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
