import type { VFileMessage } from 'vfile-message';

export type Error = {
	error: {
		message: string;
	};
};

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
