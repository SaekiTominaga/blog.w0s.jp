/* ブログ（blog.w0s.jp） */
declare namespace BlogApi {
	/* 本文プレビュー */
	interface Preview {
		html: string;
		messages: object[];
	}
}

/* メディア（media.w0s.jp） */
declare namespace MediaApi {
	/* アップロード */
	interface Upload {
		name: string;
		size: number;
		code: number;
		message: string;
	}
}
