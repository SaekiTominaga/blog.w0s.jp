import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import type { Result as ValidationResult, ValidationError } from 'express-validator';
import Controller from '../Controller.js';
import type ControllerInterface from '../ControllerInterface.js';
import BlogPostDao from '../dao/BlogPostDao.js';
import CreateFeed from '../process/CreateFeed.js';
import CreateNewlyJson from '../process/CreateNewlyJson.js';
import CreateSitemap from '../process/CreateSitemap.js';
import PostMastodon from '../process/PostMastodon.js';
import HttpBasicAuth, { type Credentials as HttpBasicAuthCredentials } from '../util/HttpBasicAuth.js';
import HttpResponse from '../util/HttpResponse.js';
import RequestUtil from '../util/RequestUtil.js';
import PostValidator from '../validator/PostValidator.js';
import type { NoName as ConfigureCommon } from '../../../configure/type/common.js';
import type { NoName as Configure } from '../../../configure/type/post.js';
import PostMisskey from '../process/PostMisskey.js';

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

/**
 * 記事投稿
 */
export default class PostController extends Controller implements ControllerInterface {
	#config: Configure;

	#env: Express.Env;

	/**
	 * @param configCommon - 共通設定
	 * @param env - NODE_ENV
	 */
	constructor(configCommon: ConfigureCommon, env: Express.Env) {
		super(configCommon);

		this.#config = JSON.parse(fs.readFileSync('configure/post.json', 'utf8'));

		this.#env = env;
	}

	/**
	 * @param req - Request
	 * @param res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const httpResponse = new HttpResponse(req, res, this.configCommon);

		/* Basic 認証 */
		const httpBasicCredentials = new HttpBasicAuth(req).getCredentials();
		if (httpBasicCredentials === null) {
			this.logger.error('Basic 認証の認証情報が取得できない');
			httpResponse.send500();
			return;
		}

		const requestQuery: BlogRequest.Post = {
			id: RequestUtil.number(req.query['id'] ?? req.body['id']),
			title: RequestUtil.string(req.body['title']),
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

		const validator = new PostValidator(req, this.#config);
		let topicValidationResult: ValidationResult<ValidationError> | null = null;
		const topicPostResults = new Set<PostResult>();
		const viewUpdateResults = new Set<ViewUpdateResult>();
		const mediaUploadResults = new Set<MediaUploadResult>();

		const dao = new BlogPostDao(this.configCommon.sqlite.db.blog);

		if (requestQuery.action_add) {
			/* 登録 */
			topicValidationResult = await validator.topic(dao);
			if (topicValidationResult.isEmpty()) {
				if (requestQuery.title === null || requestQuery.message === null) {
					this.logger.warn('データ登録時に必要なパラメーターが指定されていない');
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
				this.logger.info('データ登録', entryId);

				const entryUrl = this.#getEntryUrl(entryId);
				topicPostResults.add({ success: true, message: `${this.#config.process_message.insert.success} ${entryUrl}` });

				const [updateModifiedResult, createFeedResult, createSitemapResult, createNewlyJsonResult] = await Promise.all([
					this.#updateModified(dao),
					this.#createFeed(),
					this.#createSitemap(),
					this.#createNewlyJson(),
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

					const [postMastodonResult, postMisskeyResult] = await Promise.all([this.#postMastodon(entryData), this.#postMisskey(entryData)]);
					topicPostResults.add(postMastodonResult);
					topicPostResults.add(postMisskeyResult);
				}
			}
		} else if (requestQuery.action_revise) {
			/* 修正実行 */
			topicValidationResult = await validator.topic(dao, requestQuery.id);
			if (topicValidationResult.isEmpty()) {
				if (requestQuery.id === null || requestQuery.title === null || requestQuery.message === null) {
					this.logger.warn('データ修正時に必要なパラメーターが指定されていない');
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
				this.logger.info('データ更新', requestQuery.id);

				const entryUrl = this.#getEntryUrl(requestQuery.id);
				topicPostResults.add({ success: true, message: `${this.#config.process_message.update.success} ${entryUrl}` });

				const [updateModified, createFeedResult, createSitemapResult, createNewlyJson] = await Promise.all([
					this.#updateModified(dao),
					this.#createFeed(),
					this.#createSitemap(),
					this.#createNewlyJson(),
				]);
				topicPostResults.add(updateModified);
				topicPostResults.add(createFeedResult);
				topicPostResults.add(createSitemapResult);
				topicPostResults.add(createNewlyJson);
			}
		} else if (requestQuery.action_revise_preview) {
			/* 修正データ選択 */
			if (requestQuery.id === null) {
				this.logger.warn('修正データ選択時に記事 ID が指定されていない');
				httpResponse.send403();
				return;
			}

			const reviseData = await dao.getReviseData(requestQuery.id);
			if (reviseData === null) {
				this.logger.warn('修正データが取得できない', requestQuery.id);
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
			for (const result of await this.#mediaUpload(req, requestQuery, httpBasicCredentials)) {
				mediaUploadResults.add(result);
			}
		} else if (requestQuery.action_view) {
			/* View アップデート反映 */
			const [updateModifiedResult, createFeedResult] = await Promise.all([this.#updateModified(dao), this.#createFeed()]);
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
		res.set('Content-Security-Policy', this.configCommon.response.header.csp_html);
		res.set('Content-Security-Policy-Report-Only', this.configCommon.response.header.cspro_html);
		res.set('Referrer-Policy', 'no-referrer');
		res.render(this.#config.view.init, {
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
	}

	/**
	 * 記事 URL を取得する
	 *
	 * @param id - 記事 ID
	 *
	 * @returns 記事 URL
	 */
	#getEntryUrl(id: number) {
		return `${this.configCommon.origin}/${String(id)}`;
	}

	/**
	 * DB の最終更新日時を更新する
	 *
	 * @param dao - Dao
	 *
	 * @returns 処理結果のメッセージ
	 */
	async #updateModified(dao: BlogPostDao): Promise<PostResult> {
		try {
			await dao.updateModified();

			this.logger.info('Modified date of DB was recorded');
		} catch (e) {
			this.logger.error(e);

			return { success: false, message: this.#config.process_message.db_modified.failure };
		}

		return { success: true, message: this.#config.process_message.db_modified.success };
	}

	/**
	 * フィード生成
	 *
	 * @returns 処理結果のメッセージ
	 */
	async #createFeed(): Promise<PostResult> {
		try {
			const result = await new CreateFeed({
				dbFilePath: this.configCommon.sqlite.db.blog,
				views: this.configCommon.views,
				root: this.configCommon.static.root,
			}).execute();

			result.createdFilesPath.forEach((filePath): void => {
				this.logger.info('Feed file was created', filePath);
			});

			if (result.createdFilesPath.length === 0) {
				return { success: true, message: this.#config.process_message.feed.none };
			}
		} catch (e) {
			this.logger.error(e);

			return { success: false, message: this.#config.process_message.feed.failure };
		}

		return { success: true, message: this.#config.process_message.feed.success };
	}

	/**
	 * サイトマップ生成
	 *
	 * @returns 処理結果のメッセージ
	 */
	async #createSitemap(): Promise<PostResult> {
		try {
			const result = await new CreateSitemap({
				dbFilePath: this.configCommon.sqlite.db.blog,
				views: this.configCommon.views,
				root: this.configCommon.static.root,
			}).execute();

			this.logger.info('Sitemap file was created', result.createdFilePath);
		} catch (e) {
			this.logger.error(e);

			return { success: false, message: this.#config.process_message.sitemap.failure };
		}

		return { success: true, message: this.#config.process_message.sitemap.success };
	}

	/**
	 * 新着 JSON ファイル生成
	 *
	 * @returns 処理結果のメッセージ
	 */
	async #createNewlyJson(): Promise<PostResult> {
		try {
			const result = await new CreateNewlyJson({
				dbFilePath: this.configCommon.sqlite.db.blog,
				root: this.configCommon.static.root,
				extentions: {
					json: this.configCommon.extension.json,
					brotli: this.configCommon.extension.brotli,
				},
			}).execute();

			result.createdFilesPath.forEach((filePath): void => {
				this.logger.info('JSON file was created', filePath);
			});
		} catch (e) {
			this.logger.error(e);

			return { success: false, message: this.#config.process_message.newly_json.failure };
		}

		return { success: true, message: this.#config.process_message.newly_json.success };
	}

	/**
	 * Mastodon 投稿
	 *
	 * @param entryData - 記事データ
	 *
	 * @returns 処理結果のメッセージ
	 */
	async #postMastodon(entryData: BlogSocial.EntryData): Promise<PostResult> {
		try {
			const result = await new PostMastodon({ views: this.configCommon.views }, this.#env).execute(entryData);

			this.logger.info('Mastodon was posted', result.url, result.content);

			return { success: true, message: `${this.#config.process_message.mastodon.success} ${result.url}` };
		} catch (e) {
			this.logger.error(e);

			return { success: false, message: this.#config.process_message.mastodon.failure };
		}
	}

	/**
	 * Misskey 投稿
	 *
	 * @param entryData - 記事データ
	 *
	 * @returns 処理結果のメッセージ
	 */
	async #postMisskey(entryData: BlogSocial.EntryData): Promise<PostResult> {
		try {
			const result = await new PostMisskey({ views: this.configCommon.views }, this.#env).execute(entryData);

			this.logger.info('Misskey was posted', result.url, result.content);

			return { success: true, message: `${this.#config.process_message.misskey.success} ${result.url}` };
		} catch (e) {
			this.logger.error(e);

			return { success: false, message: this.#config.process_message.misskey.failure };
		}
	}

	/**
	 * メディアファイルをアップロードする
	 *
	 * @param req - Request
	 * @param requestQuery - URL クエリー情報
	 * @param httpBasicCredentials - Basic 認証の資格情報
	 *
	 * @returns 処理結果のメッセージ
	 */
	async #mediaUpload(req: Request, requestQuery: BlogRequest.Post, httpBasicCredentials: HttpBasicAuthCredentials): Promise<Set<MediaUploadResult>> {
		if (req.files === undefined) {
			throw new Error('メディアアップロード時にファイルが指定されていない');
		}

		const url = this.#env === 'development' ? this.#config.media_upload.url_dev : this.#config.media_upload.url;

		const result = new Set<MediaUploadResult>();

		try {
			await Promise.all(
				(req.files as Express.Multer.File[]).map(async (file) => {
					const urlSearchParams = new URLSearchParams();
					urlSearchParams.append('name', file.originalname);
					urlSearchParams.append('type', file.mimetype);
					urlSearchParams.append('temppath', path.resolve(file.path));
					urlSearchParams.append('size', String(file.size));
					if (requestQuery.media_overwrite) {
						urlSearchParams.append('overwrite', '1');
					}

					this.logger.info('Fetch', url);
					this.logger.info('Fetch', urlSearchParams);

					try {
						const response = await fetch(url, {
							method: 'POST',
							headers: {
								Authorization: `Basic ${Buffer.from(`${httpBasicCredentials.username}:${httpBasicCredentials.password}`).toString('base64')}`,
							},
							body: urlSearchParams,
						});
						if (!response.ok) {
							this.logger.error('Fetch error', url);

							result.add({
								success: false,
								message: this.#config.media_upload.api_response.other_message_failure,
								filename: file.originalname,
							});
							return;
						}

						const responseFile = (await response.json()) as MediaApi.Upload;
						switch (responseFile.code) {
							case this.#config.media_upload.api_response.success.code:
								/* 成功 */
								this.logger.info('File upload success', responseFile.name);

								result.add({
									success: true,
									message: this.#config.media_upload.api_response.success.message,
									filename: file.originalname,
								});
								break;
							case this.#config.media_upload.api_response.type.code:
								/* MIME エラー */
								this.logger.warn('File upload failure', responseFile.name);

								result.add({
									success: false,
									message: this.#config.media_upload.api_response.type.message,
									filename: file.originalname,
								});
								break;
							case this.#config.media_upload.api_response.overwrite.code:
								/* 上書きエラー */
								this.logger.warn('File upload failure', responseFile.name);

								result.add({
									success: false,
									message: this.#config.media_upload.api_response.overwrite.message,
									filename: file.originalname,
								});
								break;
							case this.#config.media_upload.api_response.size.code:
								/* サイズ超過エラー */
								this.logger.warn('File upload failure', responseFile.name);

								result.add({
									success: false,
									message: this.#config.media_upload.api_response.size.message,
									filename: file.originalname,
								});
								break;
							default:
								this.logger.warn('File upload failure', responseFile.name);

								result.add({
									success: false,
									message: this.#config.media_upload.api_response.other_message_failure,
									filename: file.originalname,
								});
						}
					} catch (e) {
						this.logger.warn(e);

						result.add({
							success: false,
							message: this.#config.media_upload.api_response.other_message_failure,
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
						this.logger.info('Temp file delete success', filePath);
					}
				});
			});
		}

		return result;
	}
}
