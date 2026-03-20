import fs from 'node:fs';
import sharp from 'sharp';
import { iec } from '@w0s/file-size-format';
import { getLogger } from '../logger.ts';
import { clearFiles, getFileNames } from '../util/file.ts';
import { getDimensions as getThumbImageDimensions, getFileName as getThumbImageFileName } from '../util/thumbImage.ts';

const logger = getLogger('Media');

/**
 * 画像ファイル生成
 *
 * @param base - 元画像のオプション
 * @param base.dir - 格納ディレクトリ
 * @param base.fileName - ファイル名
 * @param thumb - サムネイル画像
 * @param thumb.dir - 格納ディレクトリ
 * @param thumb.maxWidth - 最大幅
 * @param thumb.maxHeight - 最大高さ
 * @param thumb.density - 密度（1x, 2x, ...）
 * @param thumb.quality - 画質（1–100）
 *
 * @returns 生成した画像ファイル名
 */
const create = async (
	base: Readonly<{
		dir: string;
		fileName: string;
	}>,
	thumb: Readonly<{
		dir: string;
		maxWidth: number;
		maxHeight: number;
		density?: number;
		quality?: number;
	}>,
): Promise<string> => {
	const baseFilePath = `${base.dir}/${base.fileName}`;

	const image = sharp(baseFilePath);

	const imageMetadata = await image.metadata();
	const thumbDimensions = getThumbImageDimensions(
		{
			width: imageMetadata.width,
			height: imageMetadata.height,
		},
		{
			maxWidth: thumb.maxWidth,
			maxHeight: thumb.maxHeight,
		},
	);

	const thumbFileName = getThumbImageFileName(base.fileName, {
		width: thumbDimensions.width,
		height: thumbDimensions.height,
		density: thumb.density,
		quality: thumb.quality,
		extension: '.avif',
	});

	image.resize(thumbDimensions);
	image.avif({
		quality: thumb.quality,
	});

	const thumbData = await image.toBuffer();

	await fs.promises.writeFile(`${thumb.dir}/${thumbFileName}`, thumbData);

	/* 生成後の処理 */
	const baseSize = iec((await fs.promises.stat(baseFilePath)).size, { digits: 1 });
	const createdSize = iec(thumbData.byteLength, { digits: 1 });

	logger.info(`画像生成完了: ${thumbFileName} (${baseSize} → ${createdSize})`);

	return thumbFileName;
};

/**
 * サムネイル画像を生成
 *
 * @param base - 元画像のオプション
 * @param base.dir - 格納ディレクトリ
 * @param base.fileName - ファイル名
 * @param thumbDir - サムネイル画像の格納ディレクトリ
 *
 * @returns 生成した画像ファイル名
 */
export const createThumbnailImage = async (
	base: Readonly<{
		dir: string;
		fileName: string;
	}>,
	thumbDir: string,
): Promise<string[]> => {
	const dimensions = [
		{ maxWidth: 640, maxHeight: 480 }, // 記事本文
		{ maxWidth: 360, maxHeight: 240 }, // 記事リスト、関連記事
	]; // 寸法

	const densityQualities = [
		{ density: 1, quality: 60 },
		{ density: 2, quality: 30 },
	]; // 密度と画質の関係値

	const thumbValiations = dimensions.flatMap((dimension) => densityQualities.map((densityQuality) => ({ ...dimension, ...densityQuality })));

	const thumbFileNames = await Promise.all(
		thumbValiations.map((thumb) =>
			create(base, {
				dir: thumbDir,
				maxWidth: thumb.maxWidth,
				maxHeight: thumb.maxHeight,
				density: thumb.density,
				quality: thumb.quality,
			}),
		),
	);

	return thumbFileNames;
};

/**
 * すべてのサムネイル画像を生成し直す
 *
 * @param baseDir - 元画像の格納ディレクトリ
 * @param thumbDir - サムネイル画像の格納ディレクトリ
 *
 * @returns 生成した画像ファイル名（元画像ごとの配列）
 */
export const cleanThumbnailImages = async (baseDir: string, thumbDir: string): Promise<string[][]> => {
	const deleted = await clearFiles(thumbDir); // 既存のサムネイル画像をクリア
	logger.debug(`\`${thumbDir}\` ディレクトリから ${String(deleted.length)} 件のファイルを削除`);

	const baseFileNames = await getFileNames(baseDir); // 元画像

	const created = await Promise.all(
		baseFileNames.map((baseFileName) =>
			createThumbnailImage(
				{
					dir: baseDir,
					fileName: baseFileName,
				},
				thumbDir,
			),
		),
	);
	logger.debug(`\`${thumbDir}\` ディレクトリに ${String(created.reduce((acc, cur) => acc + cur.length, 0))} 件のファイルを生成`);

	return created;
};
