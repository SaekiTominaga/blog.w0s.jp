import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import type { Result as ValidationResult, ValidationError } from 'express-validator';
import Log4js from 'log4js';
import configureExpress from '../config/express.js';
import configurePost from '../config/post.js';
import BlogPostDao from '../dao/BlogPostDao.js';
import createFeed from '../process/feed.js';
import createNewlyJson from '../process/newlyJson.js';
import createSitemap from '../process/sitemap.js';
import postBluesky from '../process/snsBluesky.js';
import postMastodon from '../process/snsMastodon.js';
import postMisskey from '../process/snsMisskey.js';
import { env } from '../util/env.js';
import HttpBasicAuth, { type Credentials as HttpBasicAuthCredentials } from '../util/HttpBasicAuth.js';
import HttpResponse from '../util/HttpResponse.js';
import RequestUtil from '../util/RequestUtil.js';
import PostValidator from '../validator/PostValidator.js';

interface PostResult {
	success: boolean;
	message: string;
}

interface ViewUpdateResult {
	success: boolean;
	message: string;
}

interface MediaUploadResult {
	success: boolean;
	message: string;
	filename: string;
}

const logger = Log4js.getLogger('entry');

/**
 * 記事 URL を取得する
 *
 * @param id - 記事 ID
 *
 * @returns 記事 URL
 */
const getEntryUrl = (id: number): string => `${env('ORIGIN')}/${String(id)}`;

/**
 * DB の最終更新日時を更新する
 *
 * @param dao - Dao
 *
 * @returns 処理結果のメッセージ
 */
const updateModified = async (dao: BlogPostDao): Promise<PostResult> => {
	try {
		await dao.updateModified();

		logger.info('Modified date of DB was recorded');
	} catch (e) {
		logger.error(e);

		return { success: false, message: configurePost.processMessage.dbModified.failure };
	}

	return { success: true, message: configurePost.processMessage.dbModified.success };
};

/**
 * フィード生成
 *
 * @returns 処理結果のメッセージ
 */
const createFeed2 = async (): Promise<PostResult> => {
	try {
		const result = await createFeed();

		result.files.forEach((filePath): void => {
			logger.info('Feed file was created', filePath);
		});

		if (result.files.length === 0) {
			return { success: true, message: configurePost.processMessage.feed.none };
		}
	} catch (e) {
		logger.error(e);

		return { success: false, message: configurePost.processMessage.feed.failure };
	}

	return { success: true, message: configurePost.processMessage.feed.success };
};

/**
 * サイトマップ生成
 *
 * @returns 処理結果のメッセージ
 */
const createSitemap2 = async (): Promise<PostResult> => {
	try {
		const result = await createSitemap();

		logger.info('Sitemap file was created', result.file);
	} catch (e) {
		logger.error(e);

		return { success: false, message: configurePost.processMessage.sitemap.failure };
	}

	return { success: true, message: configurePost.processMessage.sitemap.success };
};

/**
 * 新着 JSON ファイル生成
 *
 * @returns 処理結果のメッセージ
 */
const createNewlyJson2 = async (): Promise<PostResult> => {
	try {
		const result = await createNewlyJson();

		result.files.forEach((filePath): void => {
			logger.info('JSON file was created', filePath);
		});
	} catch (e) {
		logger.error(e);

		return { success: false, message: configurePost.processMessage.newlyJson.failure };
	}

	return { success: true, message: configurePost.processMessage.newlyJson.success };
};

/**
 * Mastodon 投稿
 *
 * @param entryData - 記事データ
 *
 * @returns 処理結果のメッセージ
 */
const postMastodon2 = async (entryData: BlogSocial.EntryData): Promise<PostResult> => {
	try {
		const result = await postMastodon(entryData);

		logger.info('Mastodon was posted', result.url, result.content);

		return { success: true, message: `${configurePost.processMessage.mastodon.success} ${result.url}` };
	} catch (e) {
		logger.error(e);

		return { success: false, message: configurePost.processMessage.mastodon.failure };
	}
};

/**
 * Bluesky 投稿
 *
 * @param entryData - 記事データ
 *
 * @returns 処理結果のメッセージ
 */
const postBluesky2 = async (entryData: BlogSocial.EntryData): Promise<PostResult> => {
	try {
		const result = await postBluesky(entryData);

		logger.info('Bluesky was posted');

		return { success: true, message: `${configurePost.processMessage.bluesky.success} ${result.profileUrl}` };
	} catch (e) {
		logger.error(e);

		return { success: false, message: configurePost.processMessage.bluesky.failure };
	}
};

/**
 * Misskey 投稿
 *
 * @param entryData - 記事データ
 *
 * @returns 処理結果のメッセージ
 */
const postMisskey2 = async (entryData: BlogSocial.EntryData): Promise<PostResult> => {
	try {
		const result = await postMisskey(entryData);

		logger.info('Misskey was posted', result.url, result.content);

		return { success: true, message: `${configurePost.processMessage.misskey.success} ${result.url}` };
	} catch (e) {
		logger.error(e);

		return { success: false, message: configurePost.processMessage.misskey.failure };
	}
};

/**
 * メディアファイルをアップロードする
 *
 * @param req - Request
 * @param requestQuery - URL クエリー情報
 * @param httpBasicCredentials - Basic 認証の資格情報
 *
 * @returns 処理結果のメッセージ
 */
const mediaUpload = async (req: Request, requestQuery: BlogRequest.Post, httpBasicCredentials: HttpBasicAuthCredentials): Promise<Set<MediaUploadResult>> => {
	if (req.files === undefined) {
		throw new Error('メディアアップロード時にファイルが指定されていない');
	}

	const url = env('MEDIA_UPLOAD_URL');

	const result = new Set<MediaUploadResult>();

	try {
		await Promise.all(
			(req.files as Express.Multer.File[]).map(async (file) => {
				const bodyObject: Readonly<Record<string, string | number | boolean>> = {
					name: file.originalname,
					type: file.mimetype,
					temp: path.resolve(file.path),
					size: file.size,
					overwrite: requestQuery.media_overwrite,
				};

				logger.info('Fetch', url, bodyObject);

				try {
					const response = await fetch(url, {
						method: 'POST',
						headers: {
							Authorization: `Basic ${Buffer.from(`${httpBasicCredentials.username}:${httpBasicCredentials.password}`).toString('base64')}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(bodyObject),
					});
					if (!response.ok) {
						logger.error('Fetch error', url);

						result.add({
							success: false,
							message: configurePost.mediaUpload.apiResponse.otherMessageFailure,
							filename: file.originalname,
						});
						return;
					}

					const responseFile = (await response.json()) as MediaApi.Upload;
					switch (responseFile.code) {
						case configurePost.mediaUpload.apiResponse.success.code:
							/* 成功 */
							logger.info('File upload success', responseFile.name);

							result.add({
								success: true,
								message: configurePost.mediaUpload.apiResponse.success.message,
								filename: file.originalname,
							});
							break;
						case configurePost.mediaUpload.apiResponse.type.code:
							/* MIME エラー */
							logger.warn('File upload failure', responseFile.name);

							result.add({
								success: false,
								message: configurePost.mediaUpload.apiResponse.type.message,
								filename: file.originalname,
							});
							break;
						case configurePost.mediaUpload.apiResponse.overwrite.code:
							/* 上書きエラー */
							logger.warn('File upload failure', responseFile.name);

							result.add({
								success: false,
								message: configurePost.mediaUpload.apiResponse.overwrite.message,
								filename: file.originalname,
							});
							break;
						case configurePost.mediaUpload.apiResponse.size.code:
							/* サイズ超過エラー */
							logger.warn('File upload failure', responseFile.name);

							result.add({
								success: false,
								message: configurePost.mediaUpload.apiResponse.size.message,
								filename: file.originalname,
							});
							break;
						default:
							logger.warn('File upload failure', responseFile.name);

							result.add({
								success: false,
								message: configurePost.mediaUpload.apiResponse.otherMessageFailure,
								filename: file.originalname,
							});
					}
				} catch (e) {
					logger.warn(e);

					result.add({
						success: false,
						message: configurePost.mediaUpload.apiResponse.otherMessageFailure,
						filename: file.originalname,
					});
				}
			}),
		);
	} finally {
		/* アップロードされた一時ファイルを削除する */
		(req.files as Express.Multer.File[]).forEach((file) => {
			const filePath = file.path;
			fs.unlink(file.path, (error) => {
				if (error === null) {
					logger.info('Temp file delete success', filePath);
				}
			});
		});
	}

	return result;
};

/**
 * 記事投稿
 *
 * @param req - Request
 * @param res - Response
 */
const execute = async (req: Request, res: Response): Promise<void> => {
	const httpResponse = new HttpResponse(req, res);

	/* Basic 認証 */
	const httpBasicCredentials = new HttpBasicAuth(req).getCredentials();
	if (httpBasicCredentials === null) {
		logger.error('Basic 認証の認証情報が取得できない');
		httpResponse.send500();
		return;
	}

	const requestQuery: BlogRequest.Post = {
		id: RequestUtil.number(req.query['id'] ?? req.body['id']),
		title: RequestUtil.string(req.body['title'] as string | undefined),
		description: RequestUtil.string(req.body['description']),
		message: RequestUtil.string(req.body['message']),
		category: RequestUtil.strings(req.body['category']),
		image: RequestUtil.string(req.body['image']),
		relation: RequestUtil.string(req.body['relation']),
		public: RequestUtil.boolean(req.body['public']),
		timestamp: RequestUtil.boolean(req.body['timestamp']),
		social: RequestUtil.boolean(req.body['social']),
		social_tag: RequestUtil.string(req.body['social_tag']),
		media_overwrite: RequestUtil.boolean(req.body['mediaoverwrite']),
		action_add: RequestUtil.boolean(req.body['actionadd']),
		action_revise: RequestUtil.boolean(req.body['actionrev']),
		action_view: RequestUtil.boolean(req.body['actionview']),
		action_revise_preview: RequestUtil.boolean(req.query['actionrevpre']),
		action_media: RequestUtil.boolean(req.body['actionmedia']),
	};

	const validator = new PostValidator(req);
	let topicValidationResult: ValidationResult<ValidationError> | null = null;
	const topicPostResults = new Set<PostResult>();
	const viewUpdateResults = new Set<ViewUpdateResult>();
	const mediaUploadResults = new Set<MediaUploadResult>();

	const dao = new BlogPostDao(env('SQLITE_BLOG'));

	if (requestQuery.action_add) {
		/* 登録 */
		topicValidationResult = await validator.topic(dao);
		if (topicValidationResult.isEmpty()) {
			if (requestQuery.title === null || requestQuery.message === null) {
				logger.warn('データ登録時に必要なパラメーターが指定されていない');
				httpResponse.send403();
				return;
			}

			const entryId = await dao.insert(
				requestQuery.title,
				requestQuery.description,
				requestQuery.message,
				requestQuery.category,
				requestQuery.image,
				requestQuery.relation?.split(',') ?? null,
				requestQuery.public,
			);
			logger.info('データ登録', entryId);

			const entryUrl = getEntryUrl(entryId);
			topicPostResults.add({ success: true, message: `${configurePost.processMessage.insert.success} ${entryUrl}` });

			const [updateModifiedResult, createFeedResult, createSitemapResult, createNewlyJsonResult] = await Promise.all([
				updateModified(dao),
				createFeed2(),
				createSitemap2(),
				createNewlyJson2(),
			]);
			topicPostResults.add(updateModifiedResult);
			topicPostResults.add(createFeedResult);
			topicPostResults.add(createSitemapResult);
			topicPostResults.add(createNewlyJsonResult);
			if (requestQuery.public && requestQuery.social) {
				const entryData: BlogSocial.EntryData = {
					url: entryUrl,
					title: requestQuery.title,
					description: requestQuery.description,
					tags: requestQuery.social_tag?.split(',') ?? null,
				};

				const [postMastodonResult, postBlueskyResult, postMisskeyResult] = await Promise.all([
					postMastodon2(entryData),
					postBluesky2(entryData),
					postMisskey2(entryData),
				]);
				topicPostResults.add(postMastodonResult);
				topicPostResults.add(postBlueskyResult);
				topicPostResults.add(postMisskeyResult);
			}
		}
	} else if (requestQuery.action_revise) {
		/* 修正実行 */
		topicValidationResult = await validator.topic(dao, requestQuery.id);
		if (topicValidationResult.isEmpty()) {
			if (requestQuery.id === null || requestQuery.title === null || requestQuery.message === null) {
				logger.warn('データ修正時に必要なパラメーターが指定されていない');
				httpResponse.send403();
				return;
			}

			await dao.update(
				requestQuery.id,
				requestQuery.title,
				requestQuery.description,
				requestQuery.message,
				requestQuery.category,
				requestQuery.image,
				requestQuery.relation?.split(',') ?? null,
				requestQuery.public,
				requestQuery.timestamp,
			);
			logger.info('データ更新', requestQuery.id);

			const entryUrl = getEntryUrl(requestQuery.id);
			topicPostResults.add({ success: true, message: `${configurePost.processMessage.update.success} ${entryUrl}` });

			const [updateModifiedResult, createFeedResult, createSitemapResult, createNewlyJsonResult] = await Promise.all([
				updateModified(dao),
				createFeed2(),
				createSitemap2(),
				createNewlyJson2(),
			]);
			topicPostResults.add(updateModifiedResult);
			topicPostResults.add(createFeedResult);
			topicPostResults.add(createSitemapResult);
			topicPostResults.add(createNewlyJsonResult);
		}
	} else if (requestQuery.action_revise_preview) {
		/* 修正データ選択 */
		if (requestQuery.id === null) {
			logger.warn('修正データ選択時に記事 ID が指定されていない');
			httpResponse.send403();
			return;
		}

		const reviseData = await dao.getReviseData(requestQuery.id);
		if (reviseData === null) {
			logger.warn('修正データが取得できない', requestQuery.id);
			httpResponse.send403();
			return;
		}

		requestQuery.title = reviseData.title;
		requestQuery.description = reviseData.description;
		requestQuery.message = reviseData.message;
		requestQuery.category = reviseData.category_ids;
		requestQuery.image = reviseData.image ?? reviseData.image_external;
		requestQuery.relation = reviseData.relation_ids.join(',');
		requestQuery.public = reviseData.public;
	} else if (requestQuery.action_media) {
		/* ファイルアップロード */
		for (const result of await mediaUpload(req, requestQuery, httpBasicCredentials)) {
			mediaUploadResults.add(result);
		}
	} else if (requestQuery.action_view) {
		/* View アップデート反映 */
		const [updateModifiedResult, createFeedResult] = await Promise.all([updateModified(dao), createFeed2()]);
		viewUpdateResults.add(updateModifiedResult);
		viewUpdateResults.add(createFeedResult);
	} else {
		requestQuery.public = true; // デフォルトの公開状態を設定
	}

	/* 初期表示 */
	const [latestId, categoryMaster] = await Promise.all([
		dao.getLatestId(), // 最新記事 ID
		dao.getCategoryMaster(), // カテゴリー情報
	]);

	const categoryMasterView = new Map<string, BlogView.Category[]>();
	for (const category of categoryMaster) {
		const groupName = category.group_name;

		const categoryOfGroupView = categoryMasterView.get(groupName) ?? [];
		categoryOfGroupView.push({
			id: category.id,
			name: category.name,
		});

		categoryMasterView.set(groupName, categoryOfGroupView);
	}

	/* レンダリング */
	res.set('Cache-Control', 'no-cache');
	res.set(
		'Content-Security-Policy',
		Object.entries(configureExpress.response.header.cspHtml)
			.map(([key, values]) => `${key} ${values.join(' ')}`)
			.join(';'),
	);
	res.set(
		'Content-Security-Policy-Report-Only',
		Object.entries(configureExpress.response.header.csproHtml)
			.map(([key, values]) => `${key} ${values.join(' ')}`)
			.join(';'),
	);
	res.set('Referrer-Policy', 'no-referrer');
	res.render(configurePost.template, {
		pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
		requestQuery: requestQuery,
		updateMode: (requestQuery.action_add && topicValidationResult?.isEmpty() === true) || requestQuery.action_revise_preview || requestQuery.action_revise,
		topicValidateErrors: topicValidationResult?.array({ onlyFirstError: true }) ?? [],
		topicPostResults: topicPostResults,
		mediaUploadResults: mediaUploadResults,
		viewUpdateResults: viewUpdateResults,
		latestId: latestId, // 最新記事 ID
		targetId: requestQuery.id ?? latestId + 1, // 編集対象の記事 ID
		categoryMaster: categoryMasterView, // カテゴリー情報
	});
};

export default execute;
