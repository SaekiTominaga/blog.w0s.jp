import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { type Database } from '../../../db/@types.ts';

const dialect = new SqliteDialect({
	database: new SQLite(process.env['SQLITE_BLOG'], {
		fileMustExist: true,
	}),
});

export const db = new Kysely<Database>({
	dialect,
});
