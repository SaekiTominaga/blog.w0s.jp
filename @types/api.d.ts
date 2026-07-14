import type { VFileMessage } from 'vfile-message';

export type Error = {
	error: {
		message: string;
	};
};

/* 記事概要 */
export type EntrySummaryData = {
	id: number;
	title: string | undefined;
	registedAt: Date | undefined;
	updatedAt: Date | undefined;
};
export type EntriesSummary = { data: EntrySummaryData[] } | Error;

/* 本文プレビュー */
export type PreviewData = {
	html: string;
	messages: VFileMessage[];
};
export type Preview = { data: PreviewData } | Error;

/* POST 送信の共通オブジェクト */
export type PostData = {
	success: boolean;
	message: string;
};
export type Post = PostData[] | Error;

/* メディア登録 */
export type MediaUploadData = PostData & {
	filename: string;
	thumbnails?: string[];
};
export type MediaUpload = MediaUploadData[] | Error;
