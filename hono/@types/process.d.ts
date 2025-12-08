export type Normal = Readonly<{
	success: boolean;
	message: string;
}>;

/* DSG キャッシュクリア */
export type DSG = Readonly<
	Normal & {
		date?: Date;
	}
>;

/* メディアアップロード */
export type Media = Readonly<
	Normal & {
		filename: string;
	}
>;
