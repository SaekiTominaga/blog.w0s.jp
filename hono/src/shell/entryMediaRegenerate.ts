import fs from 'node:fs';
import { env } from '@w0s/env-value-type';
import { iec } from '@w0s/file-size-format';
import { create as createThumbImage } from '../../../media/dist/thumbImage.js';
import configProcess from '../config/process.ts';
import { clearFiles, getFileNames } from '../util/file.ts';
import { getLogger } from '../logger.ts';

/**
 * 本文用サムネイル画像全生成
 */
const startTime = Date.now();

const logger = getLogger('entryMediaRegenerate');

const baseDir = `${env('ROOT')}/${configProcess.media.image.dir}`; // 元画像の格納ディレクトリ
const thumbDir = `${env('ROOT')}/${configProcess.media.image.thumb.dir}`; // サムネイル画像の格納ディレクトリ

const deleted = await clearFiles(thumbDir); // 既存のサムネイル画像をクリア
logger.info(`\`${configProcess.media.image.thumb.dir}\` ディレクトリから ${String(deleted.length)} 件のファイルを削除`);

const baseFileNames = await getFileNames(baseDir); // 元画像

const createdList = await Promise.all(
	baseFileNames.map(async (baseFileName) => {
		const baseFile = await fs.promises.readFile(`${baseDir}/${baseFileName}`);

		const createdFiles = await createThumbImage(
			{
				buffer: baseFile,
				fileName: baseFileName,
			},
			{
				dir: thumbDir,
				dimensions: configProcess.media.image.thumb.dimensions,
				densityQualities: configProcess.media.image.thumb.densityQualities,
			},
		);

		const baseFileSize = baseFile.buffer.byteLength;

		return createdFiles.map((createdFile) => {
			logger.info(`サムネイル画像生成: ${createdFile.name} (${iec(baseFileSize, { digits: 1 })} → ${iec(createdFile.size, { digits: 1 })})`);
			return createdFile.name;
		});
	}),
);

const createdSize = createdList.reduce((acc, cur) => acc + cur.length, 0);
const processTime = Date.now() - startTime;
const processTimeSecond = Math.round(processTime / 1000);

logger.info(
	`${new Intl.NumberFormat().format(createdSize)}件のファイルを生成（${new Intl.DurationFormat('ja')
		.format({
			hours: Math.floor(processTimeSecond / 3600),
			minutes: Math.floor((processTimeSecond % 3600) / 60),
			seconds: processTimeSecond % 60,
		})
		.replaceAll(' ', '')}）`,
);
