declare namespace BlogView {
	interface EntryData {
		id: number;
		title: string;
		message?: string;
		description?: string | null;
		image_internal: string | null;
		image_external: string | null;
		registed_at: import('dayjs').Dayjs;
		updated_at?: import('dayjs').Dayjs | null;
	}

	interface Category {
		id: string;
		name: string;
	}

	interface FeedEntry {
		id: number;
		title: string;
		description: string | null;
		message: string;
		updated_at: import('dayjs').Dayjs;
		update: boolean;
	}

	interface SitemapEntry {
		id: number;
		updated_at: import('dayjs').Dayjs;
	}

	interface NewlyEntry {
		id: number;
		title: string;
	}

	interface AmazonDp {
		asin: string;
		title: string;
		binding: string | null;
		product_group: string | null;
		publication_date: import('dayjs').Dayjs | null;
		image_url: string | null;
		image_width: number | null;
		image_height: number | null;
		entry_ids: number[];
	}
}
