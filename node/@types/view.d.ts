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

	export interface Category {
		id: string;
		name: string;
	}

	export interface FeedEntry {
		id: number;
		title: string;
		message: string;
		updated_at: Dayjs;
		update: boolean;
	}

	export interface SitemapEntry {
		id: number;
		updated_at: Dayjs;
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
		publication_date: Dayjs | null;
		image_url: string | null;
		image_width: number | null;
		image_height: number | null;
		entry_ids: number[];
	}
}
