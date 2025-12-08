/* 本文プレビュー */
export type Preview = Readonly<_Preview>;

interface _Preview {
	html: string;
	messages: readonly object[];
}

/* DSG キャッシュクリア */
export type Clear = readonly Readonly<_Clear>[];

interface _Clear {
	success: boolean;
	message: string;
}

/* アップロード（media.w0s.jp） */
export type Upload = Readonly<_Upload>;

interface _Upload {
	name: string;
	size: number;
	code: number;
	message: string;
}
