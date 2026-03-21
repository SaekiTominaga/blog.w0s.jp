import fs from 'node:fs';
import { Hono, type Context } from 'hono';
import { MIMEType } from 'whatwg-mimetype';
import { env } from '@w0s/env-value-type';
import type { Variables } from '../app.ts';
import config from '../config/media.ts';
import { createThumbnailImage } from '../process/media.ts';
import { form as validatorForm } from '../validator/media.ts';
import type { Media as Result, MediaResult as FileResult } from '../../../@types/api.d.ts';

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
): Promise<FileResult> => {
	const logger = context.get('logger');

	const filePath = `${dir}/${file.name}`;

	if (!overwrite && fs.existsSync(filePath)) {
		/* 同名ファイル存在 */
		return {
			success: false,
			message: config.message.overwrite,
			filename: file.name,
		};
	}

	if (file.size > limit) {
		/* ファイルサイズ超過 */
		return {
			success: false,
			message: config.message.size,
			filename: file.name,
		};
	}

	await fs.promises.writeFile(filePath, file.stream());
	logger.info(`ファイルアップロード: ${filePath}`);

	return {
		success: true,
		message: config.message.success,
		filename: file.name,
	};
};

export const mediaApp = new Hono<{ Variables: Variables }>().post(validatorForm, async (context) => {
	const { req } = context;
	const logger = context.get('logger');

	const requestBody = req.valid('form');

	const { files, overwrite } = requestBody;

	const fileResults = await Promise.all(
		files.map(async (file): Promise<FileResult> => {
			switch (new MIMEType(file.type).type) {
				case 'image': {
					const fileResult = await upload(context, file, {
						dir: `${env('ROOT')}/${config.image.dir}`,
						limit: config.image.limit,
						overwrite: overwrite,
					});

					if (!fileResult.success) {
						return fileResult;
					}

					const created = await createThumbnailImage(
						{
							dir: `${env('ROOT')}/${config.image.dir}`,
							fileName: file.name,
						},
						`${env('ROOT')}/${config.image.thumbDir}`,
					);
					logger.info(created, 'サムネイルファイル生成');

					return fileResult;
				}
				case 'video': {
					return upload(context, file, {
						dir: `${env('ROOT')}/${config.video.dir}`,
						limit: config.video.limit,
						overwrite: overwrite,
					});
				}
				default: {
					return {
						success: false,
						message: config.message.type,
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
