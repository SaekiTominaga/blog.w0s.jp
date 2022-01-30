import { Dayjs } from 'dayjs';

declare namespace BlogView {
	export interface EntryData {
		id: number;
		title: string;
		message?: string;
		description?: string | null;
		image_internal: string | null;
		image_external: string | null;
		created: Dayjs;
		last_updated?: Dayjs | null;
	}

	export interface FeedEntry {
		id: number;
		title: string;
		message: string;
		last_modified: Dayjs;
		update: boolean;
	}

	export interface SitemapEntry {
		id: number;
		last_modified: Dayjs;
	}

	export interface AmazonDp {
		asin: string;
		title: string;
		binding: string | null;
		product_group: string | null;
		publication_date: Dayjs | null;
		image_url: string | null;
		image_width: number | null;
		image_height: number | null;
		entry_ids: number[];
	}
}
