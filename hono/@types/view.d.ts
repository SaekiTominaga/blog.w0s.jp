import type { Dayjs } from 'dayjs';

export type Entries = readonly Readonly<_EntryData>[];

interface _EntryData {
	id: number;
	title: string;
	message?: string;
	description?: string | undefined;
	imageInternal: string | undefined;
	imageExternal: URL | undefined;
	registedAt: Dayjs;
	updatedAt?: Dayjs | undefined;
}

export type Categories = Readonly<_Category>[]; // TODO: readonly 付けたい

interface _Category {
	id: string;
	name: string;
}

export type FeedEntry = Readonly<_FeedEntry>;

interface _FeedEntry {
	id: number;
	title: string;
	description: string | undefined;
	message: string;
	updatedAt: Dayjs;
	update: boolean;
}

export type SitemapEntry = Readonly<_SitemapEntry>;

interface _SitemapEntry {
	id: number;
	updatedAt: Dayjs;
}

export type NewlyEntry = Readonly<_NewlyEntry>;

interface _NewlyEntry {
	id: number;
	title: string;
}
