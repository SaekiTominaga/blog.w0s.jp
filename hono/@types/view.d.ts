declare namespace BlogView {
	interface EntryData {
		id: number;
		title: string;
		message?: string;
		description?: string | undefined;
		imageInternal: string | undefined;
		imageExternal: URL | undefined;
		registedAt: import('dayjs').Dayjs;
		updatedAt?: import('dayjs').Dayjs | undefined;
	}

	interface Category {
		id: string;
		name: string;
	}

	interface FeedEntry {
		id: number;
		title: string;
		description: string | undefined;
		message: string;
		updatedAt: import('dayjs').Dayjs;
		update: boolean;
	}

	interface SitemapEntry {
		id: number;
		updatedAt: import('dayjs').Dayjs;
	}

	interface NewlyEntry {
		id: number;
		title: string;
	}
}
