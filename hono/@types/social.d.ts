export type EntryData = Readonly<{
	url: string;
	title: string;
	description: string | undefined;
	tags: readonly string[] | undefined;
}>;
