/* ブログ（blog.w0s.jp） */
declare namespace BlogApi {
	/* 本文プレビュー */
	interface Preview {
		html: string;
		messages: VFileMessages[];
	}
}

/* メディア（media.w0s.jp） */
declare namespace MediaApi {
	/* アップロード */
	interface Upload {
		name: string | null;
		size: number | null;
		code: number;
		message: string;
	}
}
