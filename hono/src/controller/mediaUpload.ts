import fs from 'node:fs';
import { type Context, Hono } from 'hono';
import { MIMEType } from 'whatwg-mimetype';
import { env } from '@w0s/env-value-type';
import { iec } from '@w0s/file-size-format';
import { create as createThumbImage } from '../../../media/dist/thumbImage.js';
import type { Variables } from '../app.ts';
import configProcess from '../config/process.ts';
import { form as validatorForm } from '../validator/mediaUpload.ts';
import type { MediaUploadResult as FileResult, MediaUpload as Result } from '../../../@types/api.d.ts';

/**
 * メディア登録
 */

/**
 * ファイルアップロード（書き込み）を実行する
 *
 * @param context - Hono Context
 * @param file - アップロードするファイル
 * @param arg1 -
 * @param arg1.dir - アップロード先ディレクトリ
 * @param arg1.limit - ファイルサイズの上限
 * @param arg1.overwrite - 上書きを許可するか
 *
 * @returns 処理結果
 */
const upload = async (
	context: Context<{ Variables: Variables }>,
	file: File,
	{ dir, limit, overwrite }: Readonly<{ dir: string; limit: number; overwrite: boolean }>,
): Promise<Omit<FileResult, 'thumbnails'>> => {
	const logger = context.get('logger');

	const filePath = `${dir}/${file.name}`;

	const exist = fs.existsSync(filePath);

	if (!overwrite && exist) {
		/* 同名ファイル存在 */
		return {
			success: false,
			message: configProcess.media.processMessageUpload.overwrite,
			filename: file.name,
		};
	}

	if (file.size > limit) {
		/* ファイルサイズ超過 */
		return {
			success: false,
			message: configProcess.media.processMessageUpload.size,
			filename: file.name,
		};
	}

	if (exist) {
		await fs.promises.unlink(filePath); // Windows でファイルロックされるための対策
		logger.info(`既存ファイル削除: ${filePath}`);
	}

	await fs.promises.writeFile(filePath, file.stream());
	logger.info(`ファイルアップロード: ${filePath}`);

	return {
		success: true,
		message: configProcess.media.processMessageUpload.success,
		filename: file.name,
	};
};

export const mediaUploadApp = new Hono<{ Variables: Variables }>().post(validatorForm, async (context) => {
	const { req } = context;
	const logger = context.get('logger');

	const requestBody = req.valid('form');

	const { files, overwrite } = requestBody;

	const fileResults = await Promise.all(
		files.map(async (file): Promise<FileResult> => {
			const mimeType = new MIMEType(file.type);
			switch (mimeType.type) {
				case 'image': {
					const fileResult = await upload(context, file, {
						dir: `${env('ROOT')}/${configProcess.media.image.dir}`,
						limit: configProcess.media.image.limit,
						overwrite: overwrite,
					});

					if (!fileResult.success || ['svg+xml'].includes(mimeType.subtype)) {
						return fileResult;
					}

					const createdFiles = await createThumbImage(
						{
							buffer: Buffer.from(await file.arrayBuffer()),
							fileName: file.name,
						},
						{
							dir: `${env('ROOT')}/${configProcess.media.image.thumb.dir}`,
							dimensions: configProcess.media.image.thumb.dimensions,
							densityQualities: configProcess.media.image.thumb.densityQualities,
						},
					);
					const createdFileNames = createdFiles.map((createdFile) => {
						logger.info(`サムネイル画像生成: ${createdFile.name} (${iec(file.size, { digits: 1 })} → ${iec(createdFile.size, { digits: 1 })})`);
						return createdFile.name;
					});

					return { ...fileResult, ...{ thumbnails: createdFileNames } };
				}
				case 'video': {
					return upload(context, file, {
						dir: `${env('ROOT')}/${configProcess.media.video.dir}`,
						limit: configProcess.media.video.limit,
						overwrite: overwrite,
					});
				}
				default: {
					return {
						success: false,
						message: configProcess.media.processMessageUpload.type,
						filename: file.name,
					};
				}
			}
		}),
	);

	return context.json({
		results: fileResults,
	} as Result);
});
