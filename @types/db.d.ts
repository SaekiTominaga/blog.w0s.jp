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
export type DEntrySqlite = { [K in keyof DEntry]: Transform<DEntry[K]> };

export interface DEntryCategory {
	entry_id: number;
	category_id: string;
}
export type DEntryCategorySqlite = { [K in keyof DEntryCategory]: Transform<DEntryCategory[K]> };

export interface DEntryRelation {
	entry_id: number;
	relation_id: string;
}
export type DEntryRelationSqlite = { [K in keyof DEntryRelation]: Transform<DEntryRelation[K]> };

export interface DInfo {
	modified: Date;
}
export type DInfoSqlite = { [K in keyof DInfo]: Transform<DInfo[K]> };

export interface MCategory {
	id: string;
	name: string;
	catgroup: string;
	sort: number;
}
export type MCategorySqlite = { [K in keyof MCategory]: Transform<MCategory[K]> };

export interface MCatgroup {
	id: string;
	name: string;
	sort: number;
	file_name: string | undefined;
}
export type MCatgroupSqlite = { [K in keyof MCatgroup]: Transform<MCatgroup[K]> };

export interface DB {
	d_entry: DEntrySqlite;
	d_entry_category: DEntryCategorySqlite;
	d_entry_relation: DEntryRelationSqlite;
	d_info: DInfoSqlite;
	m_category: MCategorySqlite;
	m_catgroup: MCatgroupSqlite;
}
