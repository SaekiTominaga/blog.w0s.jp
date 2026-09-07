import fs from 'node:fs';
import { env } from '@w0s/env-value-type';

/**
 * キャッシュファイルクリア
 *
 * @param dir - 対象ディレクトリ
 *
 * @returns 削除したファイルパス
 */
export const clear = async (dir = `${env('ROOT')}/${env('HTML_DIR')}`): Promise<string[]> => {
	const entries = await fs.promises.readdir(dir, {
		withFileTypes: true,
	});

	const results = await Promise.all(
		entries.map(async (entry): Promise<string[]> => {
			const targetPath = `${dir}/${entry.name}`;

			if (entry.isDirectory()) {
				return clear(targetPath);
			} else if (entry.isFile()) {
				await fs.promises.unlink(targetPath);

				return [targetPath];
			}

			return [];
		}),
	);

	return results.flat();
};
