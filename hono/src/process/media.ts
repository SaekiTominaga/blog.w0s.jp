import fs from 'node:fs';
import sharp from 'sharp';
import { getDimensions as getThumbImageDimensions, getFileName as getThumbImageFileName } from '../util/thumbImage.ts';

/**
 * サムネイル画像を生成
 *
 * @param base - 元画像
 * @param base.buffer - Buffer
 * @param base.fileName - ファイル名
 * @param thumb - サムネイル画像
 * @param thumb.dir - 格納ディレクトリ
 *
 * @returns 生成した画像情報
 */
export const createThumbnailImage = async (
	base: Readonly<{
		buffer: Buffer<ArrayBuffer>;
		fileName: string;
	}>,
	thumb: Readonly<{
		dir: string;
		dimensions: readonly Readonly<{ maxWidth: number; maxHeight: number }>[];
		densityQualities: readonly Readonly<{ density: number; quality: number }>[];
	}>,
): Promise<
	{
		name: string;
		size: number;
	}[]
> => {
	const thumbValiations = thumb.dimensions.flatMap((dimension) => thumb.densityQualities.map((densityQuality) => ({ ...dimension, ...densityQuality })));

	const image = sharp(base.buffer);

	const baseMetadata = await image.metadata();

	const thumbFiles = await Promise.all(
		thumbValiations.map(async (thumbValiation) => {
			const thumbDimensions = getThumbImageDimensions(
				{
					width: baseMetadata.width,
					height: baseMetadata.height,
				},
				{
					maxWidth: thumbValiation.maxWidth,
					maxHeight: thumbValiation.maxHeight,
					density: thumbValiation.density,
				},
			);

			image.resize(thumbDimensions);
			image.avif({
				quality: thumbValiation.quality,
			});

			const thumbData = await image.toBuffer();

			const thumbFileName = getThumbImageFileName(base.fileName, {
				width: thumbValiation.maxWidth,
				height: thumbValiation.maxHeight,
				density: thumbValiation.density,
				quality: thumbValiation.quality,
				extension: '.avif',
			});

			await fs.promises.writeFile(`${thumb.dir}/${thumbFileName}`, thumbData);

			return {
				name: thumbFileName,
				size: thumbData.byteLength,
			};
		}),
	);

	image.destroy();

	return thumbFiles;
};
