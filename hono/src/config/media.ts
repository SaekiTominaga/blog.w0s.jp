export default {
	image: {
		dir: 'public/image/entry',
		thumbDir: 'public/image/entry/thumb',
		limit: 3072000,
	},
	video: {
		dir: 'public/video/entry',
		limit: 30720000,
	},
	message: {
		success: 'ファイルアップロードが成功しました。',
		type: '指定されたファイルはサポートされていない種類です。',
		overwrite: '同じ名前のファイルが既に存在します。',
		size: 'ファイルサイズが大きすぎます。',
	},
};
