import type { Generated } from 'kysely';

type TypeTransform<T> = T extends boolean ? 0 | 1 : T extends Date ? number : T extends URL ? string : T;
type NullTransform<T> = Exclude<T, undefined> | (undefined extends T ? null : never);
type Transform<T> = TypeTransform<NullTransform<T>>;

export interface DEntry {
	id: Generated<number>;
	title: string;
	description: string | undefined;
	message: string;
	image_internal: string | undefined;
	image_external: URL | undefined;
	registed_at: Date;
	updated_at: Date | undefined;
	public: boolean;
}

export interface DEntryCategory {
	entry_id: number;
	category_id: string;
}

export interface DEntryRelation {
	entry_id: number;
	relation_id: string;
}

export interface DInfo {
	modified: Date;
}

export interface MCategory {
	id: string;
	name: string;
	catgroup: string;
	sort: number;
}

export interface MCatgroup {
	id: string;
	name: string;
	sort: number;
	file_name: string | undefined;
}

export interface DB {
	d_entry: { [K in keyof DEntry]: Transform<DEntry[K]> };
	d_entry_category: { [K in keyof DEntryCategory]: Transform<DEntryCategory[K]> };
	d_entry_relation: { [K in keyof DEntryRelation]: Transform<DEntryRelation[K]> };
	d_info: { [K in keyof DInfo]: Transform<DInfo[K]> };
	m_category: { [K in keyof MCategory]: Transform<MCategory[K]> };
	m_catgroup: { [K in keyof MCatgroup]: Transform<MCatgroup[K]> };
}
