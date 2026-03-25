/**
 * サムネイル画像の寸法を算出する
 *
 * @param base - 元画像の寸法
 * @param thumb - サムネイル画像の最大寸法
 *
 * @returns サムネイル画像のファイル名
 */
export const getDimensions = (
	base: Readonly<{ width: number; height: number }>,
	thumb: Readonly<{ maxWidth: number; maxHeight: number; density: number | undefined }>,
): { width: number; height: number } => {
	const thumbDensity = thumb.density ?? 1;
	const thumbMaxWidth = thumb.maxWidth * thumbDensity;
	const thumbMaxHeight = thumb.maxHeight * thumbDensity;
	if (thumbMaxWidth < base.width || thumbMaxHeight < base.height) {
		/* 幅か高さ、どちらかより縮小割合が大きい方を基準に縮小する */
		const reductionRatio = Math.min(thumbMaxWidth / base.width, thumbMaxHeight / base.height);

		return {
			width: Math.round(base.width * reductionRatio),
			height: Math.round(base.height * reductionRatio),
		};
	}

	return {
		width: base.width,
		height: base.height,
	};
};

/**
 * サムネイル画像のファイル名を取得する
 *
 * @param baseFileName - 元画像のファイル名
 * @param thumb - サムネイル画像の情報
 * @param thumb.width - 幅
 * @param thumb.height - 高さ
 * @param thumb.density - 密度（1x, 2x, ...）
 * @param thumb.quality - 画質（1–100）
 * @param thumb.extension - 拡張子
 *
 * @returns サムネイル画像のファイル名
 */
export const getFileName = (
	baseFileName: string,
	thumb: Readonly<{ width: number; height: number; density?: number | undefined; quality?: number | undefined; extension: string }>,
): string => {
	if (thumb.width < 1 || thumb.width > 9999) {
		throw new RangeError('The value of the `width` must be between 1 and 9999');
	}
	if (!Number.isInteger(thumb.width)) {
		throw new RangeError('The value of the `width` must be an integer');
	}

	if (thumb.height < 1 || thumb.height > 9999) {
		throw new RangeError('The value of the `height` must be between 1 and 9999');
	}
	if (!Number.isInteger(thumb.height)) {
		throw new RangeError('The value of the `height` must be an integer');
	}

	if (thumb.density !== undefined) {
		if (thumb.density < 1 || thumb.density > 10) {
			throw new RangeError('The value of the `density` must be between 1 and 10');
		}
		if (!Number.isInteger(thumb.density)) {
			throw new RangeError('The value of the `density` must be an integer');
		}
	}

	if (thumb.quality !== undefined) {
		if (thumb.quality < 1 || thumb.quality > 100) {
			throw new RangeError('The value of the `quality` must be between 1 and 100');
		}
		if (!Number.isInteger(thumb.quality)) {
			throw new RangeError('The value of the `quality` must be an integer');
		}
	}

	if (!thumb.extension.startsWith('.')) {
		throw new Error('The value of the `extension` must begin with a period');
	}

	const paramDimensions = `d=${String(thumb.width * (thumb.density ?? 1))}x${String(thumb.height * (thumb.density ?? 1))}`;
	const paramQuality = thumb.quality !== undefined ? `q=${String(thumb.quality)}` : undefined;

	return `${baseFileName}@${[paramDimensions, paramQuality].filter((param) => param !== undefined).join(';')}${thumb.extension}`; // e.g `path/to.jpg@d=100x200;q=80.avif`
};
