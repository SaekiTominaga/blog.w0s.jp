/* ブログ（blog.w0s.jp） */
declare namespace BlogApi {
	/* 本文プレビュー */
	export interface Preview {
		html: string;
	}

	/* ツイート情報取得 */
	export type TweetMedia = {
		media_urls: string[];
	};

	/* Amazon 商品画像取得 */
	export interface AmazonImage {
		image_urls: string[];
		errors: string[];
	}
}

/* メディア（media.w0s.jp） */
declare namespace MediaApi {
	/* アップロード */
	export interface Upload {
		name: string | null;
		size: number | null;
		code: number;
		message: string;
	}
}
