import { env } from '@w0s/env-value-type';
import DSGDao from '../db/DSG.ts';

/**
 * Deferred Static Generation キャッシュクリア
 *
 * @returns 設定した日時
 */
export const clear = async (): Promise<Date> => {
	const dao = new DSGDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`);

	const modified = await dao.updateModified();

	return modified;
};
