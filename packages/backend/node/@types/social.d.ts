declare namespace BlogSocial {
	interface EntryData {
		url: string;
		title: string;
		description: string | null;
		tags: string[] | null;
	}
}
