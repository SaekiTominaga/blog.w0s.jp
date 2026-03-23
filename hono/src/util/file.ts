import fs from 'node:fs';
import path from 'node:path';

/**
 * 対象ディレクトリ内（サブディレクトリを除く）のファイル一覧を取得
 *
 * @param dir - 対象ディレクトリ
 * @param extentions - 取得する拡張子（未指定時はすべてのファイルを取得する）
 *
 * @returns ファイル名
 */
export const getFileNames = async (dir: string, extentions?: string[]): Promise<string[]> => {
	const fileNames = (await fs.promises.readdir(dir, { withFileTypes: true })).filter((resource) => resource.isFile()).map((file) => file.name);

	if (extentions === undefined) {
		return fileNames;
	}
	return fileNames.filter((fileName) => extentions.includes(path.extname(fileName)));
};

/**
 * すべてのファイルを削除
 *
 * @param dir - 対象ディレクトリ
 *
 * @returns 削除したファイルパス
 */
export const clearFiles = async (dir: string): Promise<string[]> => {
	const resources = await fs.promises.readdir(dir, { withFileTypes: true });
	const filePaths = resources.filter((resource) => resource.isFile()).map((file) => `${file.parentPath}/${file.name}`);

	await Promise.all(filePaths.map((filePath) => fs.promises.unlink(filePath)));

	return filePaths;
};
