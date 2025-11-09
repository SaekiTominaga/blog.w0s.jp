import { type Insertable, type Selectable, type Updateable } from 'kysely';

export interface Database {
	d_entry: EntryTable;
}

export interface EntryTable {
	id: number;
	title: string;
	description: string | null;
	message: string;
	imageInternal: string | null;
	imageExternal: URL | null;
	registedAt: Date;
	updatedAt: Date | null;
	public: boolean;
}
export type Entry = Selectable<EntryTable>;
export type NewEntry = Insertable<EntryTable>;
export type EntryUpdate = Updateable<EntryTable>;
