import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { env } from '@w0s/env-value-type';
import type { Variables } from '../app.ts';
import configAdmin from '../config/admin.ts';
import { form as validatorForm } from '../validator/media.ts';
import type { Media as Result, MediaResult as FileResult, Upload } from '../../../@types/api.d.ts';

/**
 * メディア登録
 */
export const mediaApp = new Hono<{ Variables: Variables }>().post(validatorForm, async (context) => {
	const { req } = context;
	const logger = context.get('logger');

	const requestBody = req.valid('form');

	const { files: requestFiles, overwrite } = requestBody;

	const uploadFiles = await Promise.all(
		requestFiles.map(async (file) => {
			/* 一時ファイルとしてアップロードする */
			const tempFileName = crypto.randomBytes(16).toString('hex'); // Multer と同じ処理 https://github.com/expressjs/multer/blob/6bb35124dea3d7cc6e5781962d76cccf1c40bd2d/storage/disk.js#L7-L9
			const tempFilePath = `${env('ROOT')}/${env('NODE_TEMP_DIR')}/${tempFileName}`;

			await fs.promises.writeFile(tempFilePath, file.stream());
			logger.info(`Temp file uploaded: ${tempFilePath}`);

			return { file, tempFilePath };
		}),
	);

	const endpoint = env('MEDIA_UPLOAD_URL');

	let fileResults: FileResult[]; // ファイルごとの処理結果

	try {
		fileResults = await Promise.all(
			uploadFiles.map(async ({ file, tempFilePath }): Promise<FileResult> => {
				const bodyObject: Readonly<Record<string, string | number | boolean>> = {
					name: file.name,
					size: file.size,
					type: file.type,
					temp: path.resolve(tempFilePath),
					overwrite: overwrite,
				};
				logger.info(`Fetch: ${endpoint} ${file.name}`);

				try {
					const response = await fetch(endpoint, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(bodyObject),
					});
					if (!response.ok) {
						logger.error(`Fetch error: ${endpoint}`);

						return {
							success: false,
							message: configAdmin.mediaUpload.apiResponse.otherMessageFailure,
							filename: file.name,
						};
					}

					const responseFile = (await response.json()) as Upload;
					switch (responseFile.code) {
						case configAdmin.mediaUpload.apiResponse.success.code:
							/* 成功 */
							logger.info(`File upload success: ${responseFile.name}`);

							return {
								success: true,
								message: configAdmin.mediaUpload.apiResponse.success.message,
								filename: file.name,
							};
						case configAdmin.mediaUpload.apiResponse.type.code:
							/* MIME エラー */
							logger.warn(`File upload failure: ${responseFile.name}`);

							return {
								success: false,
								message: configAdmin.mediaUpload.apiResponse.type.message,
								filename: file.name,
							};
						case configAdmin.mediaUpload.apiResponse.overwrite.code:
							/* 上書きエラー */
							logger.warn(`File upload failure: ${responseFile.name}`);

							return {
								success: false,
								message: configAdmin.mediaUpload.apiResponse.overwrite.message,
								filename: file.name,
							};
						case configAdmin.mediaUpload.apiResponse.size.code:
							/* サイズ超過エラー */
							logger.warn(`File upload failure: ${responseFile.name}`);

							return {
								success: false,
								message: configAdmin.mediaUpload.apiResponse.size.message,
								filename: file.name,
							};
						default:
							logger.warn(`File upload failure: ${responseFile.name}`);

							return {
								success: false,
								message: configAdmin.mediaUpload.apiResponse.otherMessageFailure,
								filename: file.name,
							};
					}
				} catch (e) {
					logger.warn(e);

					return {
						success: false,
						message: configAdmin.mediaUpload.apiResponse.otherMessageFailure,
						filename: file.name,
					};
				}
			}),
		);
	} finally {
		await Promise.all(
			uploadFiles.map(async ({ tempFilePath }) => {
				/* 一時ファイルを削除する */
				if (!fs.existsSync(tempFilePath)) {
					logger.info(`Temp file have already been deleted: ${tempFilePath}`);
					return;
				}

				await fs.promises.unlink(tempFilePath);
				logger.info(`Temp file deleted: ${tempFilePath}`);
			}),
		);
	}

	return context.json({
		results: fileResults,
	} as Result);
});
