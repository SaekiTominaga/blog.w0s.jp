import fs from 'node:fs';
import { Hono, type Context } from 'hono';
import { MIMEType } from 'whatwg-mimetype';
import { env } from '@w0s/env-value-type';
import type { Variables } from '../app.ts';
import configMedia from '../config/media.ts';
import { createThumbnailImage } from '../process/media.ts';
import { form as validatorForm } from '../validator/mediaUpload.ts';
import type { MediaUpload as Result, MediaUploadResult as FileResult } from '../../../@types/api.d.ts';

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
			message: configMedia.message.overwrite,
			filename: file.name,
		};
	}

	if (file.size > limit) {
		/* ファイルサイズ超過 */
		return {
			success: false,
			message: configMedia.message.size,
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
		message: configMedia.message.success,
		filename: file.name,
	};
};

export const mediaUploadApp = new Hono<{ Variables: Variables }>().post(validatorForm, async (context) => {
	const { req } = context;

	const requestBody = req.valid('form');

	const { files, overwrite } = requestBody;

	const fileResults = await Promise.all(
		files.map(async (file): Promise<FileResult> => {
			const mimeType = new MIMEType(file.type);
			switch (mimeType.type) {
				case 'image': {
					const fileResult = await upload(context, file, {
						dir: `${env('ROOT')}/${configMedia.image.dir}`,
						limit: configMedia.image.limit,
						overwrite: overwrite,
					});

					if (!fileResult.success || ['svg+xml'].includes(mimeType.subtype)) {
						return fileResult;
					}

					const created = await createThumbnailImage(
						{
							buffer: Buffer.from(await file.arrayBuffer()),
							fileName: file.name,
						},
						`${env('ROOT')}/${configMedia.image.thumbDir}`,
					);

					return { ...fileResult, ...{ thumbnails: created } };
				}
				case 'video': {
					return upload(context, file, {
						dir: `${env('ROOT')}/${configMedia.video.dir}`,
						limit: configMedia.video.limit,
						overwrite: overwrite,
					});
				}
				default: {
					return {
						success: false,
						message: configMedia.message.type,
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
