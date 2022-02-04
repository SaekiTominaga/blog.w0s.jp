/* ブログ（blog.w0s.jp） */
declare namespace BlogApi {
	/* 本文プレビュー */
	interface Preview {
		html: string;
	}

	/* ツイート情報取得 */
	type TweetMedia = {
		media_urls: string[];
	};

	/* Amazon 商品画像取得 */
	interface AmazonImage {
		image_urls: string[];
		errors: string[];
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
