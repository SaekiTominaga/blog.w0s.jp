import { DatabaseSync, type DatabaseSyncOptions } from 'node:sqlite';

/**
 * 日記共通
 */
export default class BlogDao {
	protected readonly db: DatabaseSync;

	/**
	 * @param filePath - DB ファイルパス
	 * @param options - 構成オプション
	 */
	constructor(filePath: string, options?: DatabaseSyncOptions) {
		this.db = new DatabaseSync(filePath, options);
	}
}
