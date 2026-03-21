import fs from 'node:fs';
import sharp from 'sharp';
import { iec } from '@w0s/file-size-format';
import { getLogger } from '../logger.ts';
import { getDimensions as getThumbImageDimensions, getFileName as getThumbImageFileName } from '../util/thumbImage.ts';

const logger = getLogger('Media');

/**
 * サムネイル画像を生成
 *
 * @param base - 元画像のオプション
 * @param base.buffer - Buffer
 * @param base.fileName - ファイル名
 * @param thumbDir - サムネイル画像の格納ディレクトリ
 *
 * @returns 生成した画像ファイル名
 */
export const createThumbnailImage = async (
	base: Readonly<{
		buffer: Buffer<ArrayBuffer>;
		fileName: string;
	}>,
	thumbDir: string,
): Promise<string[]> => {
	const dimensions = [
		{ maxWidth: 640, maxHeight: 480 }, // 記事本文
		{ maxWidth: 180, maxHeight: 120 }, // 記事リスト、関連記事
	]; // 寸法

	const densityQualities = [
		{ density: 1, quality: 60 },
		{ density: 2, quality: 30 },
	]; // 密度（1x, 2x, ...）と画質（1–100）の関係値

	const thumbValiations = dimensions.flatMap((dimension) =>
		densityQualities.map((densityQuality) => ({ ...{ dir: thumbDir }, ...dimension, ...densityQuality })),
	);

	const image = sharp(base.buffer);

	const baseMetadata = await image.metadata();

	const thumbFileNames = await Promise.all(
		thumbValiations.map(async (thumb) => {
			const thumbDimensions = getThumbImageDimensions(
				{
					width: baseMetadata.width,
					height: baseMetadata.height,
				},
				{
					maxWidth: thumb.maxWidth,
					maxHeight: thumb.maxHeight,
					density: thumb.density,
				},
			);

			image.resize(thumbDimensions);
			image.avif({
				quality: thumb.quality,
			});

			const thumbData = await image.toBuffer();

			const thumbFileName = getThumbImageFileName(base.fileName, {
				width: thumb.maxWidth,
				height: thumb.maxHeight,
				density: thumb.density,
				quality: thumb.quality,
				extension: '.avif',
			});

			await fs.promises.writeFile(`${thumb.dir}/${thumbFileName}`, thumbData);

			/* 生成後の処理 */
			const baseFileSize = iec(base.buffer.length, { digits: 1 });
			const createdFileSize = iec(thumbData.byteLength, { digits: 1 });

			logger.info(`サムネイル画像生成: ${thumbFileName} (${baseFileSize} → ${createdFileSize})`);

			return thumbFileName;
		}),
	);

	image.destroy();

	return thumbFileNames;
};
