declare namespace BlogSocial {
	interface EntryData {
		url: string;
		title: string;
		description: string | undefined;
		tags: readonly string[] | undefined;
	}
}
