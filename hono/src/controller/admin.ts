import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ejs from 'ejs';
import { Hono, type Context } from 'hono';
import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
import configHono from '../config/hono.ts';
import configAdmin from '../config/admin.ts';
import PostDao, { type ReviseData } from '../db/Post.ts';
import createFeed from '../process/feed.ts';
import createNewlyJson from '../process/newlyJson.ts';
import createSitemap from '../process/sitemap.ts';
import postBluesky from '../process/snsBluesky.ts';
import postMastodon from '../process/snsMastodon.ts';
import postMisskey from '../process/snsMisskey.ts';
import { getEntryUrl } from '../util/blogUrl.ts';
import { csp as cspHeader } from '../util/httpHeader.ts';
import { query as validatorQuery, type RequestQuery } from '../validator/admin.ts';
import { form as validatorPostForm } from '../validator/adminPost.ts';
import { form as validatorUploadForm } from '../validator/adminUpload.ts';

/**
 * 記事投稿
 */
const logger = Log4js.getLogger('entry');

/**
 * DB の最終更新日時を更新する
 *
 * @param dao - Dao
 *
 * @returns 処理結果のメッセージ
 */
const updateModified = async (dao: PostDao): Promise<Process.Result> => {
	try {
		await dao.updateModified();

		logger.info('Modified date of DB was recorded');
	} catch (e) {
		logger.error(e);

		return { success: false, message: configAdmin.processMessage.dbModified.failure };
	}

	return { success: true, message: configAdmin.processMessage.dbModified.success };
};

/**
 * 初期画面表示
 *
 * @param context - Context
 * @param requestQuery - URL クエリー情報
 * @param reviseData - 修正記事データ
 * @param updateMode - 新規追加 or 修正
 * @param validate - バリデートエラーメッセージ
 * @param validate.select - 記事選択
 * @param validate.post - 記事投稿
 * @param validate.update - View アップデート反映
 * @param validate.upload - メディアアップロード
 * @param results - 処理結果
 * @param results.post - 記事投稿
 * @param results.update - View アップデート反映
 * @param results.upload - メディアアップロード
 *
 * @returns Response
 */
const rendering = async (
	context: Context,
	requestQuery?: Readonly<RequestQuery>,
	reviseData?: Readonly<ReviseData>,
	updateMode?: boolean,
	validate?: Readonly<{
		select?: string[];
		post?: string[];
		update?: string[];
		upload?: string[];
	}>,
	results?: Readonly<{
		post?: Process.Result[];
		update?: Process.Result[];
		upload?: Process.UploadResult[];
	}>,
): Promise<Response> => {
	const { req, res } = context;

	const dao = new PostDao(env('SQLITE_BLOG'), {
		readonly: true,
	});

	/* 初期表示 */
	const [latestId, categoryMaster] = await Promise.all([
		dao.getLatestId(), // 最新記事 ID
		dao.getCategoryMaster(), // カテゴリー情報
	]);

	const categoryMasterView = new Map<string, BlogView.Category[]>();
	categoryMaster.forEach((category) => {
		const { group_name: groupName } = category;

		const categoryOfGroupView = categoryMasterView.get(groupName) ?? [];
		categoryOfGroupView.push({
			id: category.id,
			name: category.name,
		});

		categoryMasterView.set(groupName, categoryOfGroupView);
	});

	/* レンダリング */
	const html = await ejs.renderFile(`${env('VIEWS')}/${configAdmin.template}`, {
		pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
		requestQuery: requestQuery ?? {},
		reviseData: reviseData ?? {},
		updateMode: updateMode ?? false,
		selectValidates: validate?.select ?? [],
		postValidates: validate?.post ?? [],
		postResults: results?.post ?? [],
		updateResults: results?.update ?? [],
		uploadResults: results?.upload ?? [],
		latestId: latestId, // 最新記事 ID
		categoryMaster: categoryMasterView, // カテゴリー情報
	});

	res.headers.set('Cache-Control', 'no-cache');
	res.headers.set('Content-Security-Policy', cspHeader(configHono.response.header.cspHtml));
	res.headers.set('Referrer-Policy', 'no-referrer');

	return context.html(html);
};

export const adminApp = new Hono()
	.get(validatorQuery, async (context) => {
		const { req } = context;

		const requestQuery = req.valid('query');

		const dao = new PostDao(env('SQLITE_BLOG'), {
			readonly: true,
		});

		let reviseData: ReviseData | undefined;
		if (requestQuery.id !== undefined) {
			/* 修正データ選択 */
			reviseData = await dao.getReviseData(requestQuery.id);
			if (reviseData === undefined) {
				/* 存在しない記事 ID を指定した場合 */
				return await rendering(context, requestQuery, reviseData, undefined, {
					select: [configAdmin.validator.entryNotFound],
				});
			}
		}

		return await rendering(context, requestQuery, reviseData, requestQuery.id !== undefined);
	})
	.post('/post', validatorPostForm, async (context) => {
		/* 記事投稿 */
		const { req } = context;

		const requestForm = req.valid('form');

		const dao = new PostDao(env('SQLITE_BLOG'));

		const postResults: Process.Result[] = [];
		let entryId: number;
		let entryUrl: string;

		let imageInternal: string | undefined;
		let imageExternal: URL | undefined;
		if (requestForm.imagePath !== undefined) {
			if (!(requestForm.imagePath instanceof URL)) {
				imageInternal = requestForm.imagePath;
			} else {
				imageExternal = requestForm.imagePath;
			}
		}

		if (requestForm.id === undefined) {
			/* 新規記事追加 */
			if (await dao.isExistsTitle(requestForm.title)) {
				return await rendering(context, undefined, undefined, false, {
					post: [configAdmin.validator.titleUnique],
				});
			}

			entryId = await dao.insert(
				{
					title: requestForm.title,
					description: requestForm.description,
					message: requestForm.message,
					image_internal: imageInternal,
					image_external: imageExternal,
					public: requestForm.public,
				},
				{
					categoryIds: requestForm.categories,
					relationIds: requestForm.relationIds,
				},
			);
			logger.info('新規記事追加', entryId);

			entryUrl = getEntryUrl(entryId);

			postResults.push({ success: true, message: `${configAdmin.processMessage.insert.success} ${entryUrl}` });
		} else {
			/* 既存記事更新 */
			entryId = requestForm.id;

			await dao.update(
				{
					id: requestForm.id,
					title: requestForm.title,
					description: requestForm.description,
					message: requestForm.message,
					image_internal: imageInternal,
					image_external: imageExternal,
					public: requestForm.public,
				},
				{
					categoryIds: requestForm.categories,
					relationIds: requestForm.relationIds,
					timestampUpdate: requestForm.timestamp,
				},
			);
			logger.info('既存記事更新', requestForm.id);

			entryUrl = getEntryUrl(requestForm.id);

			postResults.push({ success: true, message: `${configAdmin.processMessage.update.success} ${entryUrl}` });
		}

		const [updateModifiedResult, createFeedResult, createSitemapResult, createNewlyJsonResult] = await Promise.all([
			updateModified(dao),
			createFeed(),
			createSitemap(),
			createNewlyJson(),
		]);
		postResults.push(updateModifiedResult);
		postResults.push(createFeedResult);
		postResults.push(createSitemapResult);
		postResults.push(createNewlyJsonResult);

		if (requestForm.public && requestForm.social) {
			const entryData: BlogSocial.EntryData = {
				url: entryUrl,
				title: requestForm.title,
				description: requestForm.description,
				tags: requestForm.socialTags,
			};

			const [postMastodonResult, postBlueskyResult, postMisskeyResult] = await Promise.all([
				postMastodon(entryData),
				postBluesky(entryData),
				postMisskey(entryData),
			]);
			postResults.push(postMastodonResult);
			postResults.push(postBlueskyResult);
			postResults.push(postMisskeyResult);
		}

		return await rendering(
			context,
			undefined,
			{
				id: entryId,
				title: requestForm.title,
				description: requestForm.description,
				message: requestForm.message,
				categoryIds: requestForm.categories ?? [],
				imageInternal: imageInternal,
				imageExternal: imageExternal,
				relationIds: requestForm.relationIds ?? [],
				public: requestForm.public,
			},
			true,
			undefined,
			{
				post: postResults,
			},
		);
	})
	.post('/update', async (context) => {
		/* View アップデート反映 */
		const dao = new PostDao(env('SQLITE_BLOG'));

		const [updateModifiedResult, createFeedResult] = await Promise.all([updateModified(dao), createFeed()]);

		const results: Process.Result[] = [];
		results.push(updateModifiedResult);
		results.push(createFeedResult);

		return await rendering(context, undefined, undefined, undefined, undefined, {
			update: results,
		});
	})
	.post('/upload', validatorUploadForm, async (context) => {
		/* メディアアップロード */
		const { req } = context;

		const requestForm = req.valid('form');

		const uploadFiles = await Promise.all(
			requestForm.files.map(async (file) => {
				/* 一時ファイルとしてアップロードする */
				const tempFileName = crypto.randomBytes(16).toString('hex'); // Multer と同じ処理 https://github.com/expressjs/multer/blob/master/storage/disk.js#L8-L10
				const tempFilePath = `${env('NODE_TEMP')}/${tempFileName}`;

				await fs.promises.writeFile(tempFilePath, file.stream());
				logger.info('Temp file upload success', tempFilePath);

				return { file, tempFilePath };
			}),
		);

		const endpoint = env('MEDIA_UPLOAD_URL');

		const results: Process.UploadResult[] = [];

		try {
			await Promise.all(
				uploadFiles.map(async ({ file, tempFilePath }) => {
					const bodyObject: Readonly<Record<string, string | number | boolean>> = {
						name: file.name,
						size: file.size,
						type: file.type,
						temp: path.resolve(tempFilePath),
						overwrite: requestForm.overwrite,
					};
					logger.info('Fetch', endpoint, file.name);

					try {
						const response = await fetch(endpoint, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify(bodyObject),
						});
						if (!response.ok) {
							logger.error('Fetch error', endpoint);

							results.push({
								success: false,
								message: configAdmin.mediaUpload.apiResponse.otherMessageFailure,
								filename: file.name,
							});
							return;
						}

						const responseFile = (await response.json()) as MediaApi.Upload;
						switch (responseFile.code) {
							case configAdmin.mediaUpload.apiResponse.success.code:
								/* 成功 */
								logger.info('File upload success', responseFile.name);

								results.push({
									success: true,
									message: configAdmin.mediaUpload.apiResponse.success.message,
									filename: file.name,
								});
								break;
							case configAdmin.mediaUpload.apiResponse.type.code:
								/* MIME エラー */
								logger.warn('File upload failure', responseFile.name);

								results.push({
									success: false,
									message: configAdmin.mediaUpload.apiResponse.type.message,
									filename: file.name,
								});
								break;
							case configAdmin.mediaUpload.apiResponse.overwrite.code:
								/* 上書きエラー */
								logger.warn('File upload failure', responseFile.name);

								results.push({
									success: false,
									message: configAdmin.mediaUpload.apiResponse.overwrite.message,
									filename: file.name,
								});
								break;
							case configAdmin.mediaUpload.apiResponse.size.code:
								/* サイズ超過エラー */
								logger.warn('File upload failure', responseFile.name);

								results.push({
									success: false,
									message: configAdmin.mediaUpload.apiResponse.size.message,
									filename: file.name,
								});
								break;
							default:
								logger.warn('File upload failure', responseFile.name);

								results.push({
									success: false,
									message: configAdmin.mediaUpload.apiResponse.otherMessageFailure,
									filename: file.name,
								});
						}
					} catch (e) {
						logger.warn(e);

						results.push({
							success: false,
							message: configAdmin.mediaUpload.apiResponse.otherMessageFailure,
							filename: file.name,
						});
					}
				}),
			);
		} finally {
			await Promise.all(
				uploadFiles.map(async ({ tempFilePath }) => {
					/* 一時ファイルを削除する */
					if (!fs.existsSync(tempFilePath)) {
						logger.info('Temp file have already been deleted', tempFilePath);
						return;
					}

					await fs.promises.unlink(tempFilePath);
					logger.info('Temp file delete success', tempFilePath);
				}),
			);
		}

		return await rendering(context, undefined, undefined, undefined, undefined, {
			upload: results,
		});
	});
