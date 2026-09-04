import type { VFileMessage } from 'vfile-message';

export interface Error {
	error: {
		message: string;
	};
}

/* 記事概要 */
export interface EntrySummaryData {
	id: number;
	title: string | undefined;
	registed: string | undefined;
	updated: string | undefined;
}
export type EntriesSummary = { data: EntrySummaryData[] } | Error;

/* 本文プレビュー */
export interface PreviewData {
	html: string;
	messages: VFileMessage[];
}
export type Preview = { data: PreviewData } | Error;

/* POST 送信の共通オブジェクト */
export interface PostData {
	success: boolean;
	message: string;
}
export type Post = PostData[] | Error;

/* メディア登録 */
export type MediaUploadData = PostData & {
	filename: string;
	thumbnails?: string[];
};
export type MediaUpload = MediaUploadData[] | Error;
