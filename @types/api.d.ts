/* 本文プレビュー */
export type Preview = Readonly<{
	html: string;
	messages: readonly object[];
}>;

/* DSG キャッシュクリア */
export type Clear = readonly Readonly<{
	success: boolean;
	message: string;
}>[];

/* アップロード（media.w0s.jp） */
export type Upload = Readonly<{
	name: string;
	size: number;
	code: number;
	message: string;
}>;
