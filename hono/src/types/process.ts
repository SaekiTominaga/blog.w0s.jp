export type Normal = Readonly<_Normal>;

interface _Normal {
	success: boolean;
	message: string;
}

/* DSG キャッシュクリア */
export type DSG = Readonly<_DSG>;

interface _DSG extends Normal {
	date?: Date;
}

/* メディアアップロード */
export type Media = Readonly<_Media>;

interface _Media extends Normal {
	filename: string;
}
