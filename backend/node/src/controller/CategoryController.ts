import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import filenamify from 'filenamify';
import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';
import type { Request, Response } from 'express';
import Controller from '../Controller.js';
import type ControllerInterface from '../ControllerInterface.js';
import configureExpress from '../config/express.js';
import configureCategory from '../config/category.js';
import BlogCategoryDao from '../dao/BlogCategoryDao.js';
import MarkdownTitle from '../markdown/Title.js';
import { env } from '../util/env.js';
import HttpResponse from '../util/HttpResponse.js';
import Sidebar from '../util/Sidebar.js';

/**
 * カテゴリー
 */
export default class CategoryController extends Controller implements ControllerInterface {
	/**
	 * @param req - Request
	 * @param res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const httpResponse = new HttpResponse(req, res);

		const requestQuery: BlogRequest.Category = {
			category_name: req.params['category_name']!,
		};

		const dao = new BlogCategoryDao(env('SQLITE_BLOG'));

		const lastModified = await dao.getLastModified();

		/* 最終更新日時をセット */
		if (httpResponse.checkLastModified(lastModified)) {
			return;
		}

		const htmlFilePath = `${env('HTML')}/${configureCategory.html.directory}/${filenamify(requestQuery.category_name)}${configureExpress.extension.html}`;
		const htmlBrotliFilePath = `${htmlFilePath}${configureExpress.extension.brotli}`;

		if (fs.existsSync(htmlFilePath) && lastModified <= (await fs.promises.stat(htmlFilePath)).mtime) {
			/* 生成された HTML をロードする */
			await httpResponse.send200({ filePath: htmlFilePath, brotliFilePath: htmlBrotliFilePath, cacheControl: configureExpress.cacheControl });
			return;
		}

		/* DB からデータ取得 */
		const entriesDto = await dao.getEntries(requestQuery.category_name);

		if (entriesDto.length === 0) {
			this.logger.info(`無効なカテゴリが指定: ${requestQuery.category_name}`);
			httpResponse.send404();
			return;
		}

		const sidebar = new Sidebar(dao);

		const [entryCountOfCategoryList, newlyEntries] = await Promise.all([
			sidebar.getEntryCountOfCategory(),
			sidebar.getNewlyEntries(configureExpress.sidebar.newly.maximumNumber),
		]);

		const entries: BlogView.EntryData[] = [];
		for (const entryDto of entriesDto) {
			let imageExternal = entryDto.image_external;
			if (imageExternal !== null) {
				const url = new URL(imageExternal);

				switch (url.origin) {
					case configureCategory.imageExternal.amazon.origin: {
						/* Amazon */
						const paapi5ItemImageUrlParser = new PaapiItemImageUrlParser(new URL(imageExternal));
						paapi5ItemImageUrlParser.setSize(configureCategory.imageExternal.amazon.size);

						imageExternal = paapi5ItemImageUrlParser.toString();
						break;
					}
					default:
				}
			}

			entries.push({
				id: entryDto.id,
				title: new MarkdownTitle(entryDto.title).mark(),
				image_internal: entryDto.image_internal,
				image_external: imageExternal,
				created: dayjs(entryDto.created),
				last_updated: entryDto.last_updated !== null ? dayjs(entryDto.last_updated) : null,
			});
		}

		/* HTML 生成 */
		const html = await ejs.renderFile(`${env('VIEWS')}/${configureCategory.template}`, {
			pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
			requestQuery: requestQuery,
			count: entries.length,
			entries: entries,
			entryCountOfCategoryList: entryCountOfCategoryList,
			newlyEntries: newlyEntries,
		});

		/* レンダリング、ファイル出力 */
		await this.response(html, {
			filePath: htmlFilePath,
			brotliFilePath: htmlBrotliFilePath,
			httpResponse: httpResponse,
		});
	}
}
