import dayjs from 'dayjs';
import ejs from 'ejs';
import { type Context, Hono } from 'hono';
import { env } from '@w0s/env-value-type';
import type { Variables } from '../app.ts';
import configHono from '../config/hono.ts';
import configProcess from '../config/process.ts';
import PostDao from '../db/Post.ts';
import { clear } from '../process/dsg.ts';
import { create as createFeed } from '../process/feed.ts';
import { create as createNewlyJson } from '../process/newlyJson.ts';
import { create as createSitemap } from '../process/sitemap.ts';
import { getEntryUrl } from '../util/blogUrl.ts';
import { csp as cspHeader } from '../util/httpHeader.ts';
import { type RequestQuery, query as validatorQuery } from '../validator/admin.ts';
import { form as validatorPostForm } from '../validator/adminPost.ts';
import type { Categories } from '../../@types/view.d.ts';

interface ProcessResult {
	success: boolean;
	message: string;
}

interface EntryData {
	id?: number;
	title: string;
	description: string | undefined;
	message: string;
	categoryIds: string[] | undefined;
	imageInternal: string | undefined;
	imageExternal: URL | undefined;
	relationIds: string[] | undefined;
	public: boolean;
	social?: boolean;
	socialTags?: string[] | undefined;
	timestampUpdate?: boolean;
}

/**
 * 記事投稿
 */

/**
 * 初期画面表示
 *
 * @param context - Hono Context
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
			entrySelect?: string[]; // 記事選択
			entryPost?: string[]; // 記事投稿
		}>;
		results?: Readonly<{
			entryPost?: ProcessResult[]; // 記事投稿
		}>;
	}>,
): Promise<Response> => {
	const { req, res } = context;

	const dao = new PostDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`, {
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
	const html = await ejs.renderFile(`${env('ROOT')}/${env('TEMPLATE_DIR')}/${configProcess.post.template}`, {
		pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
		requestQuery: requestQuery ?? {},
		entryData: entryData ?? {},
		entrySubmitMode: entrySubmitMode,
		selectValidates: validate?.entrySelect ?? [],
		postValidates: validate?.entryPost ?? [],
		postResults: results?.entryPost ?? [],
		latestId: latestId, // 最新記事 ID
		categoryMaster: categoryMasterView, // カテゴリー情報
	});

	res.headers.set('Cache-Control', 'no-cache');
	res.headers.set('Content-Security-Policy', cspHeader(configHono.response.header.cspHtml));
	res.headers.set('Referrer-Policy', 'no-referrer');

	return context.html(html);
};

export const adminApp = new Hono<{ Variables: Variables }>()
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

		const dao = new PostDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`, {
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
					entrySelect: [configProcess.post.validator.entryNotFound],
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
		const logger = context.get('logger');

		const requestForm = req.valid('form');

		const dao = new PostDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`);

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

		if (requestForm.id === undefined) {
			/* 新規記事追加 */
			if (await dao.isExistsTitle(requestForm.title)) {
				/* 既存記事と同じタイトルが指定された場合 */
				return await rendering(context, {
					entryData: entryData,
					entrySubmitMode: 'insert',
					validate: {
						entryPost: [configProcess.post.validator.titleUnique],
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
			logger.info(`新規記事追加: ${String(entryData.id)}`);

			postResults.push({ success: true, message: `${configProcess.post.processMessage.insert.success} ${getEntryUrl(entryData.id)}` });
		} else {
			/* 既存記事更新 */
			entryData.id = requestForm.id;

			if (await dao.isExistsTitle(requestForm.title, requestForm.id)) {
				/* 既存記事と同じタイトルが指定された場合 */
				return await rendering(context, {
					entryData: entryData,
					entrySubmitMode: 'update',
					validate: {
						entryPost: [configProcess.post.validator.titleUnique],
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
			logger.info(`既存記事更新: ${String(entryData.id)}`);

			postResults.push({ success: true, message: `${configProcess.post.processMessage.update.success} ${getEntryUrl(entryData.id)}` });
		}

		const [clearDSGResult, insertSNSQueue, createFeedResult, createSitemapResult, createNewlyJsonResult] = await Promise.allSettled([
			clear(),
			entryData.public && entryData.social
				? (async (entryId) => ({ insertId: await dao.insertSNSQueue(entryId, entryData.socialTags) }))(entryData.id)
				: undefined,
			createFeed(),
			createSitemap(),
			createNewlyJson(),
		]);

		if (clearDSGResult.status === 'fulfilled') {
			logger.info(`Modified date of DB was recorded: ${clearDSGResult.value.toString()}`);
			postResults.push({ success: true, message: `${configProcess.dsg.processMessage.success} <${dayjs(clearDSGResult.value).format('HH:mm:ss')}>` });
		} else {
			logger.error(clearDSGResult.reason);
			postResults.push({ success: false, message: `${configProcess.dsg.processMessage.failure}: ${String(clearDSGResult.reason)}` });
		}

		if (insertSNSQueue.status === 'fulfilled') {
			if (insertSNSQueue.value !== undefined) {
				logger.info(`SNS queue date of DB was recorded (Column ID: ${String(insertSNSQueue.value.insertId)})`);
				postResults.push({
					success: true,
					message: configProcess.post.processMessage.insertSNSQueue.success,
				});
			}
		} else {
			logger.error(insertSNSQueue.reason);
			postResults.push({ success: false, message: `${configProcess.post.processMessage.insertSNSQueue.failure}: ${String(insertSNSQueue.reason)}` });
		}

		if (createFeedResult.status === 'fulfilled') {
			logger.info(createFeedResult.value, `Feed file created:`);
			postResults.push({ success: true, message: `${configProcess.feed.processMessage.success}（${String(createFeedResult.value.length)}ファイル）` });
		} else {
			logger.error(createFeedResult.reason);
			postResults.push({ success: false, message: `${configProcess.feed.processMessage.failure}: ${String(createFeedResult.reason)}` });
		}

		if (createSitemapResult.status === 'fulfilled') {
			logger.info(createSitemapResult.value, `Sitemap file created:`);
			postResults.push({ success: true, message: `${configProcess.sitemap.processMessage.success}（${String(createSitemapResult.value.length)}ファイル）` });
		} else {
			logger.error(createSitemapResult.reason);
			postResults.push({ success: false, message: `${configProcess.sitemap.processMessage.failure}: ${String(createSitemapResult.reason)}` });
		}

		if (createNewlyJsonResult.status === 'fulfilled') {
			logger.info(createNewlyJsonResult.value, `JSON file created:`);
			postResults.push({
				success: true,
				message: `${configProcess.newlyJson.processMessage.success}（${String(createNewlyJsonResult.value.length)}ファイル）`,
			});
		} else {
			logger.error(createNewlyJsonResult.reason);
			postResults.push({ success: false, message: `${configProcess.newlyJson.processMessage.failure}: ${String(createNewlyJsonResult.reason)}` });
		}

		return await rendering(context, {
			entryData: entryData,
			entrySubmitMode: 'update',
			results: {
				entryPost: postResults,
			},
		});
	});
