export default {
	image: {
		dir: 'public/entry/image',
		thumbDir: 'public/entry/image/thumb',
		limit: 3072000,
	},
	video: {
		dir: 'public/entry/video',
		limit: 30720000,
	},
	message: {
		success: 'ファイルアップロードが成功しました。',
		type: '指定されたファイルはサポートされていない種類です。',
		overwrite: '同じ名前のファイルが既に存在します。',
		size: 'ファイルサイズが大きすぎます。',
	},
};
