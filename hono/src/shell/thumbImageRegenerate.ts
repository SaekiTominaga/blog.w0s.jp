import fs from 'node:fs';
import { env } from '@w0s/env-value-type';
import configMedia from '../config/media.ts';
import { createThumbnailImage } from '../process/media.ts';
import { clearFiles, getFileNames } from '../util/file.ts';

/**
 * サムネイル画像全生成
 */
const startTime = Date.now();

const baseDir = `${env('ROOT')}/${configMedia.image.dir}`; // 元画像の格納ディレクトリ
const thumbDir = `${env('ROOT')}/${configMedia.image.thumbDir}`; // サムネイル画像の格納ディレクトリ

const deleted = await clearFiles(thumbDir); // 既存のサムネイル画像をクリア
console.info(`\`${thumbDir}\` ディレクトリから ${String(deleted.length)} 件のファイルを削除`);

const baseFileNames = await getFileNames(baseDir); // 元画像

const created: string[][] = []; // 生成した画像ファイル名（元画像ごとの配列）

// eslint-disable-next-line functional/no-loop-statements
for (const baseFileName of baseFileNames) {
	// eslint-disable-next-line no-await-in-loop
	const baseFile = await fs.promises.readFile(`${baseDir}/${baseFileName}`);

	// eslint-disable-next-line no-await-in-loop
	const c = await createThumbnailImage(
		{
			buffer: baseFile,
			fileName: baseFileName,
		},
		thumbDir,
	);

	created.push(c);
}

const createdSize = created.reduce((acc, cur) => acc + cur.length, 0);
const processTime = Date.now() - startTime;
console.info(`\`${thumbDir}\` ディレクトリに ${new Intl.NumberFormat().format(createdSize)} 件のファイルを生成（${String(Math.round(processTime / 1000))}秒）`);
