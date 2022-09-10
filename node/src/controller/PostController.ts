import BlogPostDao from '../dao/BlogPostDao.js';
import Compress from '../util/Compress.js';
import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import dayjs from 'dayjs';
import ejs from 'ejs';
import fs from 'fs';
import HttpBasicAuth, { Credentials as HttpBasicAuthCredentials } from '../util/HttpBasicAuth.js';
import HttpResponse from '../util/HttpResponse.js';
import MessageParser from '../util/MessageParser.js';
import path from 'path';
import PostValidator from '../validator/PostValidator.js';
import prettier from 'prettier';
import RequestUtil from '../util/RequestUtil.js';
import Tweet from '../util/Tweet.js';
import xmlFormatter from 'xml-formatter';
import { NoName as Configure } from '../../configure/type/post';
import { NoName as ConfigureCommon } from '../../configure/type/common';
import { Request, Response } from 'express';
import { Result as ValidationResult, ValidationError } from 'express-validator';
import { TwitterAPI as ConfigureTwitter } from '../../configure/type/twitter.js';
import { TwitterApi, TwitterApiTokens } from 'twitter-api-v2';

interface PostResults {
	success: boolean;
	message: string;
}

interface ViewUpdateResults {
	success: boolean;
	message: string;
}

interface MediaUploadResults {
	success: boolean;
	message: string;
	filename: string;
}

/**
 * 記事投稿
 */
export default class PostController extends Controller implements ControllerInterface {
	#configCommon: ConfigureCommon;
	#config: Configure;
	#configTwitter: ConfigureTwitter;

	/**
	 * @param {ConfigureCommon} configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super();

		this.#configCommon = configCommon;
		this.#config = <Configure>JSON.parse(fs.readFileSync('node/configure/post.json', 'utf8'));
		this.#configTwitter = <ConfigureTwitter>JSON.parse(fs.readFileSync('node/configure/twitter.json', 'utf8'));
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const httpResponse = new HttpResponse(req, res, this.#configCommon);

		/* Basic 認証 */
		const httpBasicCredentials = new HttpBasicAuth(req).getCredentials();
		if (httpBasicCredentials === null) {
			this.logger.error('Basic 認証の認証情報が取得できない');
			httpResponse.send500();
			return;
		}

		const requestQuery: BlogRequest.Post = {
			id: RequestUtil.number(req.query.id ?? req.body.id),
			title: RequestUtil.string(req.body.title),
			description: RequestUtil.string(req.body.description),
			message: RequestUtil.string(req.body.message),
			category: RequestUtil.strings(req.body.category),
			image: RequestUtil.string(req.body.image),
			relation: RequestUtil.string(req.body.relation),
			public: RequestUtil.boolean(req.body.public),
			timestamp: RequestUtil.boolean(req.body.timestamp),
			social: RequestUtil.boolean(req.body.social),
			social_tag: RequestUtil.string(req.body.socialtag),
			media_overwrite: RequestUtil.boolean(req.body.mediaoverwrite),
			action_add: RequestUtil.boolean(req.body.actionadd),
			action_revise: RequestUtil.boolean(req.body.actionrev),
			action_view: RequestUtil.boolean(req.body.actionview),
			action_revise_preview: RequestUtil.boolean(req.query.actionrevpre),
			action_media: RequestUtil.boolean(req.body.actionmedia),
		};

		const validator = new PostValidator(req, this.#config);
		let topicValidationResult: ValidationResult<ValidationError> | null = null;
		const topicPostResults: Set<PostResults> = new Set();
		const viewUpdateResults: Set<ViewUpdateResults> = new Set();
		const mediaUploadResults: Set<MediaUploadResults> = new Set();

		const dao = new BlogPostDao(this.#configCommon);

		if (requestQuery.action_add) {
			/* 登録 */
			topicValidationResult = await validator.topic(dao);
			if (topicValidationResult.isEmpty()) {
				if (requestQuery.title === null || requestQuery.message === null) {
					this.logger.warn('データ登録時に必要なパラメーターが指定されていない');
					httpResponse.send403();
					return;
				}

				const topicId = await dao.insert(
					requestQuery.title,
					requestQuery.description,
					requestQuery.message,
					requestQuery.category,
					requestQuery.image,
					requestQuery.relation?.split(',') ?? null,
					requestQuery.public
				);
				this.logger.info('データ登録', topicId);
				topicPostResults.add({ success: true, message: this.#config.insert.message_success });

				topicPostResults.add(await this.#updateModified(dao));
				const [createFeedResult, createSitemapResult] = await Promise.all([this.#createFeed(dao), this.#createSitemap(dao)]);
				topicPostResults.add(createFeedResult);
				topicPostResults.add(createSitemapResult);
				topicPostResults.add(await this.#createNewlyJson(dao));
				if (requestQuery.social) {
					topicPostResults.add(await this.#postSocial(req, requestQuery, topicId));
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
					requestQuery.timestamp
				);
				this.logger.info('データ更新', requestQuery.id);
				topicPostResults.add({ success: true, message: this.#config.update.message_success });

				topicPostResults.add(await this.#updateModified(dao));
				const [createFeedResult, createSitemapResult] = await Promise.all([this.#createFeed(dao), this.#createSitemap(dao)]);
				topicPostResults.add(createFeedResult);
				topicPostResults.add(createSitemapResult);
				topicPostResults.add(await this.#createNewlyJson(dao));
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
			const [updateModifiedResult, createFeedResult] = await Promise.all([this.#updateModified(dao), this.#createFeed(dao)]);
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

		const categoryMasterView: Map<string, BlogView.Category[]> = new Map();
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
		res.setHeader('Content-Security-Policy', this.#configCommon.response.header.csp_html);
		res.setHeader('Content-Security-Policy-Report-Only', this.#configCommon.response.header.cspro_html);
		res.setHeader('Referrer-Policy', 'no-referrer');
		res.render(this.#config.view.init, {
			page: {
				path: req.path,
				query: requestQuery,
			},
			updateMode: (requestQuery.action_add && topicValidationResult?.isEmpty()) || requestQuery.action_revise_preview || requestQuery.action_revise,
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
	 * DB の最終更新日時を更新する
	 *
	 * @param {BlogPostDao} dao - Dao
	 *
	 * @returns {PostResults} 処理結果のメッセージ
	 */
	async #updateModified(dao: BlogPostDao): Promise<PostResults> {
		try {
			await dao.updateModified();
			this.logger.info('`d_info` table update success');
		} catch (e) {
			this.logger.error('`d_info` table update failed', e);

			return { success: false, message: this.#config.update_modified.response.message_failure };
		}

		return { success: true, message: this.#config.update_modified.response.message_success };
	}

	/**
	 * フィードファイルを生成する
	 *
	 * @param {BlogPostDao} dao - Dao
	 *
	 * @returns {PostResults} 処理結果のメッセージ
	 */
	async #createFeed(dao: BlogPostDao): Promise<PostResults> {
		try {
			const entriesDto = await dao.getEntriesFeed(this.#config.feed_create.maximum_number);

			if (entriesDto.length === 0) {
				this.logger.info('Feed file was not created because there were zero data.');

				return { success: true, message: this.#config.feed_create.response.message_none };
			}

			const dbh = await dao.getDbh();

			const entriesView: Set<BlogView.FeedEntry> = new Set();
			for (const entry of entriesDto) {
				entriesView.add({
					id: entry.id,
					title: entry.title,
					message: await new MessageParser(this.#configCommon, dbh, entry.id).toXml(entry.message),
					updated_at: dayjs(entry.updated_at ?? entry.created_at),
					update: Boolean(entry.updated_at),
				});
			}

			const feedXml = await ejs.renderFile(`${this.#configCommon.views}/${this.#config.feed_create.view_path}`, {
				updated_at: [...entriesView].at(0)?.updated_at,
				entries: entriesView,
			});

			let feedXmlFormatted = '';
			try {
				feedXmlFormatted = prettier
					.format(feedXml, <prettier.Options>this.#configCommon.prettier.html)
					.replaceAll(/\t*<!-- prettier-ignore -->\t*\n/g, '')
					.trim();
			} catch (e) {
				this.logger.error('Prettier failed', e);
				feedXmlFormatted = feedXml;
			}

			const feedXmlBrotli = Compress.brotliText(feedXmlFormatted);

			/* ファイル出力 */
			const filePath = `${this.#configCommon.static.root}${this.#config.feed_create.path}`;
			const brotliFilePath = `${filePath}.br`;

			await Promise.all([fs.promises.writeFile(filePath, feedXmlFormatted), fs.promises.writeFile(brotliFilePath, feedXmlBrotli)]);
			this.logger.info('Feed file created', filePath);
			this.logger.info('Feed Brotli file created', brotliFilePath);
		} catch (e) {
			this.logger.error('Feed file create failed', e);

			return { success: false, message: this.#config.feed_create.response.message_failure };
		}

		return { success: true, message: this.#config.feed_create.response.message_success };
	}

	/**
	 * サイトマップファイルを生成する
	 *
	 * @param {BlogPostDao} dao - Dao
	 *
	 * @returns {PostResults} 処理結果のメッセージ
	 */
	async #createSitemap(dao: BlogPostDao): Promise<PostResults> {
		try {
			const [lastModifiedDto, entries] = await Promise.all([
				dao.getLastModified(),
				dao.getEntriesSitemap(
					this.#config.sitemap_create
						.url_limit /* TODO: 厳密にはこの上限数から個別記事以外の URL 数を差し引いた数にする必要があるが、超充分に猶予があるのでとりあえずこれで */
				),
			]);

			const sitemapXml = await ejs.renderFile(`${this.#configCommon.views}/${this.#config.sitemap_create.view_path}`, {
				updated_at: dayjs(lastModifiedDto),
				entries: entries,
			});

			const sitemapXmlFormated = xmlFormatter(sitemapXml, {
				/* https://github.com/chrisbottin/xml-formatter#options */
				indentation: '\t',
				collapseContent: true,
				lineSeparator: '\n',
			});

			/* ファイル出力 */
			const filePath = `${this.#configCommon.static.root}${this.#config.sitemap_create.path}`;

			await fs.promises.writeFile(filePath, sitemapXmlFormated);
			this.logger.info('Sitemap file created', filePath);
		} catch (e) {
			this.logger.error('Sitemap file create failed', e);

			return { success: false, message: this.#config.sitemap_create.response.message_failure };
		}

		return { success: true, message: this.#config.sitemap_create.response.message_success };
	}

	/**
	 * 新着 JSON ファイルを生成する
	 *
	 * @param {BlogPostDao} dao - Dao
	 *
	 * @returns {PostResults} 処理結果のメッセージ
	 */
	async #createNewlyJson(dao: BlogPostDao): Promise<PostResults> {
		try {
			const datas: Map<string, BlogView.NewlyEntry[]> = new Map();
			datas.set('', await dao.getEntriesNewly(this.#config.newly_json_create.maximum_number));

			const fileNames = await dao.getCategoryGroupMasterFileName();
			for (const fileNameType of fileNames) {
				datas.set(fileNameType, await dao.getEntriesNewly(this.#config.newly_json_create.maximum_number, fileNameType));
			}

			for (const [fileNameType, data] of datas) {
				const newlyJson = JSON.stringify(data);

				const newlyJsonBrotli = Compress.brotliText(newlyJson);

				/* ファイル出力 */
				const fileName =
					fileNameType === ''
						? `${this.#config.newly_json_create.filename_prefix}`
						: `${this.#config.newly_json_create.filename_prefix}${this.#config.newly_json_create.filename_separator}${fileNameType}`;
				const filePath = `${this.#configCommon.static.root}/${this.#config.newly_json_create.directory}/${fileName}.${
					this.#config.newly_json_create.extension
				}`;
				const brotliFilePath = `${filePath}.br`;

				await Promise.all([fs.promises.writeFile(filePath, newlyJson), fs.promises.writeFile(brotliFilePath, newlyJsonBrotli)]);
				this.logger.info('JSON file created', filePath);
				this.logger.info('JSON Brotli file created', brotliFilePath);
			}
		} catch (e) {
			this.logger.error('新着 JSON 生成失敗', e);

			return { success: false, message: this.#config.newly_json_create.response.message_failure };
		}

		return { success: true, message: this.#config.newly_json_create.response.message_success };
	}

	/**
	 * ソーシャルサービスに投稿する
	 *
	 * @param {Request} req - Request
	 * @param {object} requestQuery - URL クエリー情報
	 * @param {number} topicId - 記事 ID
	 *
	 * @returns {PostResults} 処理結果のメッセージ
	 */
	async #postSocial(req: Request, requestQuery: BlogRequest.Post, topicId: number): Promise<PostResults> {
		try {
			/* Twitter */
			let twitterAccessTokenOptions: TwitterApiTokens;
			if (req.hostname === 'localhost') {
				twitterAccessTokenOptions = {
					appKey: this.#configTwitter.dev.consumer_key,
					appSecret: this.#configTwitter.dev.consumer_secret,
					accessToken: this.#configTwitter.dev.access_token,
					accessSecret: this.#configTwitter.dev.access_token_secret,
				};
			} else {
				twitterAccessTokenOptions = {
					appKey: this.#configTwitter.production.consumer_key,
					appSecret: this.#configTwitter.production.consumer_secret,
					accessToken: this.#configTwitter.production.access_token,
					accessSecret: this.#configTwitter.production.access_token_secret,
				};
			}

			const twitterApi = new TwitterApi(twitterAccessTokenOptions);
			const tweet = new Tweet(twitterApi);

			const hashtags = requestQuery.social_tag?.split(' '); // ハッシュタグ

			const topicUrl = `${this.#config.twitter.url_prefix}${topicId}`;
			let message = `${this.#config.twitter.message_prefix}\n\n${requestQuery.title}\n${topicUrl}`;
			if (requestQuery.description !== '') {
				message += `\n\n${requestQuery.description}`;
			}
			const response = await tweet.postMessage(message, '', hashtags);

			this.logger.info('Twitter post success', response);
		} catch (e) {
			this.logger.error('Twitter post failed', e);

			return { success: false, message: this.#config.twitter.api_response.message_failure };
		}

		return { success: true, message: this.#config.twitter.api_response.message_success };
	}

	/**
	 * メディアファイルをアップロードする
	 *
	 * @param {Request} req - Request
	 * @param {object} requestQuery - URL クエリー情報
	 * @param {HttpBasicAuthCredentials | null} httpBasicCredentials - Basic 認証の資格情報
	 */
	async #mediaUpload(req: Request, requestQuery: BlogRequest.Post, httpBasicCredentials: HttpBasicAuthCredentials | null): Promise<Set<MediaUploadResults>> {
		if (req.files === undefined) {
			throw new Error('メディアアップロード時にファイルが指定されていない');
		}

		const url = req.hostname === 'localhost' ? this.#config.media_upload.url_dev : this.#config.media_upload.url;

		const result: Set<MediaUploadResults> = new Set();

		try {
			for (const file of <Express.Multer.File[]>req.files) {
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
							Authorization: `Basic ${Buffer.from(`${httpBasicCredentials?.username}:${httpBasicCredentials?.password}`).toString('base64')}`,
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
						continue;
					}

					const responseFile = <MediaApi.Upload>await response.json();
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
			}
		} finally {
			/* アップロードされた一時ファイルを削除する */
			for (const file of <Express.Multer.File[]>req.files) {
				const filePath = file.path;
				fs.unlink(file.path, (error) => {
					if (error === null) {
						this.logger.info('Temp file delete success', filePath);
					}
				});
			}
		}

		return result;
	}
}
