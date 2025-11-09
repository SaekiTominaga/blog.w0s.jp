import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { env } from '@w0s/env-value-type';
import { type Database } from './@types.ts';

const dialect = new SqliteDialect({
	database: new SQLite(env('SQLITE_BLOG'), {
		fileMustExist: true,
	}),
});

export const db = new Kysely<Database>({
	dialect,
});
