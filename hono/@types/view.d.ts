import type { Dayjs } from 'dayjs';

export type Entries = readonly Readonly<{
	id: number;
	title: string;
	message?: string;
	description?: string | undefined;
	imageInternal: string | undefined;
	imageExternal: URL | undefined;
	registedAt: Dayjs;
	updatedAt?: Dayjs | undefined;
}>[];

export type Categories = Readonly<{
	id: string;
	name: string;
}>[]; // TODO: readonly 付けたい

export type FeedEntry = Readonly<{
	id: number;
	title: string;
	description: string | undefined;
	message: string;
	updatedAt: Dayjs;
	update: boolean;
}>;

export type SitemapEntry = Readonly<{
	id: number;
	updatedAt: Dayjs;
}>;

export type NewlyEntry = Readonly<{
	id: number;
	title: string;
}>;
