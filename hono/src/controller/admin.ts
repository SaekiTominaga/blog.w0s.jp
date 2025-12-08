import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ejs from 'ejs';
import { Hono, type Context } from 'hono';
import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
import configHono from '../config/hono.ts';
import configAdmin from '../config/admin.ts';
import PostDao from '../db/Post.ts';
import clear from '../process/dsg.ts';
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
import type { Upload } from '../../../@types/api.d.ts';
import type { Normal as ProcessResult, Media as ProcessMediaResult } from '../../@types/process.d.ts';
import type { EntryData as SocialEntryData } from '../../@types/social.d.ts';
import type { Categories } from '../../@types/view.d.ts';

interface EntryData {
	id?: number;
	title: string;
	description: string | undefined;
	message: string;
	categoryIds: readonly string[] | undefined;
	imageInternal: string | undefined;
	imageExternal: URL | undefined;
	relationIds: readonly string[] | undefined;
	public: boolean;
	social?: boolean;
	socialTags?: readonly string[] | undefined;
	timestampUpdate?: boolean;
}

/**
 * 記事投稿
 */
const logger = Log4js.getLogger('entry');

/**
 * 初期画面表示
 *
 * @param context - Context
 * @param arg1 -
 * @param arg1.requestQuery - URL クエリー情報
 * @param arg1.entryData - 記事データ
 * @param arg1.entrySubmitMode - 新規追加 or 修正
 * @param arg1.validate - バリデートエラーメッセージ
 * @param arg1.results - 処理結果
 *
 * @returns Response
 */
const rendering = async (
	context: Context,
	{
		requestQuery,
		entryData,
		entrySubmitMode,
		validate,
		results,
	}: Readonly<{
		requestQuery?: Readonly<RequestQuery>;
		entryData?: Readonly<EntryData>;
		entrySubmitMode?: 'insert' | 'update';
		validate?: Readonly<{
			entrySelect?: readonly string[]; // 記事選択
			entryPost?: readonly string[]; // 記事投稿
			viewUpdate?: readonly string[]; // View アップデート反映
			media?: readonly string[]; // メディアアップロード
		}>;
		results?: Readonly<{
			entryPost?: readonly ProcessResult[]; // 記事投稿
			viewUpdate?: readonly ProcessResult[]; // View アップデート反映
			media?: readonly ProcessMediaResult[]; // メディアアップロード
		}>;
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

	const categoryMasterView = new Map<string, Categories>();
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
		entryData: entryData ?? {},
		entrySubmitMode: entrySubmitMode,
		selectValidates: validate?.entrySelect ?? [],
		postValidates: validate?.entryPost ?? [],
		postResults: results?.entryPost ?? [],
		updateResults: results?.viewUpdate ?? [],
		uploadResults: results?.media ?? [],
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

		if (requestQuery.id === undefined) {
			/* 初期表示 */
			return await rendering(context, {
				requestQuery: requestQuery,
				entrySubmitMode: 'insert',
			});
		}

		const dao = new PostDao(env('SQLITE_BLOG'), {
			readonly: true,
		});

		/* 修正データ選択 */
		const reviseData = await dao.getReviseData(requestQuery.id);
		if (reviseData === undefined) {
			/* 存在しない記事 ID を指定した場合 */
			return await rendering(context, {
				requestQuery: requestQuery,
				entrySubmitMode: 'insert',
				validate: {
					entrySelect: [configAdmin.validator.entryNotFound],
				},
			});
		}

		/* 既存記事の修正 */
		return await rendering(context, {
			requestQuery: requestQuery,
			entryData: {
				id: reviseData.id,
				title: reviseData.title,
				description: reviseData.description,
				message: reviseData.message,
				categoryIds: reviseData.category_ids,
				imageInternal: reviseData.image_internal,
				imageExternal: reviseData.image_external,
				relationIds: reviseData.relation_ids,
				public: reviseData.public,
			},
			entrySubmitMode: 'update',
		});
	})
	.post('/post', validatorPostForm, async (context) => {
		/* 記事投稿 */
		const { req } = context;

		const requestForm = req.valid('form');

		const dao = new PostDao(env('SQLITE_BLOG'));

		const entryData: EntryData = {
			title: requestForm.title,
			description: requestForm.description,
			message: requestForm.message,
			categoryIds: requestForm.categories,
			imageInternal: typeof requestForm.imagePath === 'string' ? requestForm.imagePath : undefined,
			imageExternal: requestForm.imagePath instanceof URL ? requestForm.imagePath : undefined,
			relationIds: requestForm.relationIds,
			public: requestForm.public,
			social: requestForm.social,
			socialTags: requestForm.socialTags,
			timestampUpdate: requestForm.timestampUpdate,
		};

		const postResults: ProcessResult[] = [];
		let entryUrl: string;

		if (requestForm.id === undefined) {
			/* 新規記事追加 */
			if (await dao.isExistsTitle(requestForm.title)) {
				/* 既存記事と同じタイトルが指定された場合 */
				return await rendering(context, {
					entryData: entryData,
					entrySubmitMode: 'insert',
					validate: {
						entryPost: [configAdmin.validator.titleUnique],
					},
				});
			}

			entryData.id = await dao.insert(
				{
					title: entryData.title,
					description: entryData.description,
					message: entryData.message,
					image_internal: entryData.imageInternal,
					image_external: entryData.imageExternal,
					public: entryData.public,
				},
				{
					categoryIds: entryData.categoryIds,
					relationIds: entryData.relationIds,
				},
			);
			logger.info('新規記事追加', entryData.id);

			entryUrl = getEntryUrl(entryData.id);

			postResults.push({ success: true, message: `${configAdmin.processMessage.insert.success} ${entryUrl}` });
		} else {
			/* 既存記事更新 */
			entryData.id = requestForm.id;

			if (await dao.isExistsTitle(requestForm.title, requestForm.id)) {
				/* 既存記事と同じタイトルが指定された場合 */
				return await rendering(context, {
					entryData: entryData,
					entrySubmitMode: 'update',
					validate: {
						entryPost: [configAdmin.validator.titleUnique],
					},
				});
			}

			await dao.update(
				{
					id: entryData.id,
					title: entryData.title,
					description: entryData.description,
					message: entryData.message,
					image_internal: entryData.imageInternal,
					image_external: entryData.imageExternal,
					public: entryData.public,
				},
				{
					categoryIds: entryData.categoryIds,
					relationIds: entryData.relationIds,
					timestampUpdate: entryData.timestampUpdate,
				},
			);
			logger.info('既存記事更新', entryData.id);

			entryUrl = getEntryUrl(entryData.id);

			postResults.push({ success: true, message: `${configAdmin.processMessage.update.success} ${entryUrl}` });
		}

		const [cacheClearResult, createFeedResult, createSitemapResult, createNewlyJsonResult] = await Promise.all([
			clear(),
			createFeed(),
			createSitemap(),
			createNewlyJson(),
		]);
		postResults.push(cacheClearResult);
		postResults.push(createFeedResult);
		postResults.push(createSitemapResult);
		postResults.push(createNewlyJsonResult);

		if (entryData.public && entryData.social) {
			const socialEntryData: SocialEntryData = {
				url: entryUrl,
				title: entryData.title,
				description: entryData.description,
				tags: entryData.socialTags,
			};

			const [postMastodonResult, postBlueskyResult, postMisskeyResult] = await Promise.all([
				postMastodon(socialEntryData),
				postBluesky(socialEntryData),
				postMisskey(socialEntryData),
			]);
			postResults.push(postMastodonResult);
			postResults.push(postBlueskyResult);
			postResults.push(postMisskeyResult);
		}

		return await rendering(context, {
			entryData: entryData,
			entrySubmitMode: 'update',
			results: {
				entryPost: postResults,
			},
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

		const results: ProcessMediaResult[] = [];

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

						const responseFile = (await response.json()) as Upload;
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

		return await rendering(context, {
			results: {
				media: results,
			},
		});
	});
