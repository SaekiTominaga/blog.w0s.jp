export type EntryData = Readonly<_EntryData>;

interface _EntryData {
	url: string;
	title: string;
	description: string | undefined;
	tags: readonly string[] | undefined;
}
