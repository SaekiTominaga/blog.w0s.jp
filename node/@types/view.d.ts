import { Dayjs } from 'dayjs';

declare namespace BlogView {
	export interface TopicData {
		id: number;
		title: string;
		message?: string;
		description?: string | null;
		image_internal: string | null;
		image_external: string | null;
		insert_date: Dayjs;
		last_update?: Dayjs | null;
	}

	export interface FeedEntry {
		id: number;
		title: string;
		message: string;
		last_updated: Dayjs;
		update: boolean;
	}

	export interface SitemapEntry {
		id: number;
		last_modified: Dayjs;
	}
}
