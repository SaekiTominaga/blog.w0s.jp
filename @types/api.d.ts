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

/* メディア登録 */
export type MediaUploadResult = {
	success: boolean;
	message: string;
	filename: string;
	thumbnails?: string[];
};
export type MediaUpload = { results: MediaUploadResult[] } | Error;

/* DSG のキャッシュクリア */
export type ClearProcess = {
	success: boolean;
	message: string;
};
export type Clear = { processes: ClearProcess[] } | Error;
