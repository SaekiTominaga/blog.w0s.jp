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
