declare namespace BlogView {
	export interface EntryData {
		id: number;
		title: string;
		message?: string;
		description?: string | null;
		image_internal: string | null;
		image_external: string | null;
		created: import('dayjs').Dayjs;
		last_updated?: import('dayjs').Dayjs | null;
	}

	export interface Category {
		id: string;
		name: string;
	}

	export interface FeedEntry {
		id: number;
		title: string;
		message: string;
		updated_at: import('dayjs').Dayjs;
		update: boolean;
	}

	export interface SitemapEntry {
		id: number;
		updated_at: import('dayjs').Dayjs;
	}

	export interface NewlyJsonEntry {
		id: number;
		title: string;
	}

	export interface AmazonDp {
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
