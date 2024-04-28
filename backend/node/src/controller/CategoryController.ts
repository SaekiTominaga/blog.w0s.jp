import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import filenamify from 'filenamify';
import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';
import type { Request, Response } from 'express';
import BlogCategoryDao from '../dao/BlogCategoryDao.js';
import Controller from '../Controller.js';
import type ControllerInterface from '../ControllerInterface.js';
import MarkdownTitle from '../markdown/Title.js';
import HttpResponse from '../util/HttpResponse.js';
import RequestUtil from '../util/RequestUtil.js';
import Sidebar from '../util/Sidebar.js';
import type { NoName as Configure } from '../../../configure/type/category.js';
import type { NoName as ConfigureCommon } from '../../../configure/type/common.js';

/**
 * カテゴリー
 */
export default class CategoryController extends Controller implements ControllerInterface {
	#config: Configure;

	/**
	 * @param configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super(configCommon);

		this.#config = JSON.parse(fs.readFileSync('configure/category.json', 'utf8'));
	}

	/**
	 * @param req - Request
	 * @param res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const httpResponse = new HttpResponse(req, res, this.configCommon);

		const requestQuery: BlogRequest.Category = {
			category_name: RequestUtil.string(req.params['category_name'])!,
		};

		const dao = new BlogCategoryDao(this.configCommon.sqlite.db.blog);

		const lastModified = await dao.getLastModified();

		/* 最終更新日時をセット */
		if (httpResponse.checkLastModified(lastModified)) {
			return;
		}

		const htmlFilePath = `${this.configCommon.html}/${this.#config.html.directory}/${filenamify(requestQuery.category_name)}${this.configCommon.extension.html}`;
		const htmlBrotliFilePath = `${htmlFilePath}${this.configCommon.extension.brotli}`;

		if (fs.existsSync(htmlFilePath) && lastModified <= (await fs.promises.stat(htmlFilePath)).mtime) {
			/* 生成された HTML をロードする */
			await httpResponse.send200({ filePath: htmlFilePath, brotliFilePath: htmlBrotliFilePath, cacheControl: this.configCommon.cache_control });
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
			sidebar.getNewlyEntries(this.configCommon.sidebar.newly.maximum_number),
		]);

		const entries: BlogView.EntryData[] = [];
		for (const entryDto of entriesDto) {
			let imageExternal = entryDto.image_external;
			if (imageExternal !== null) {
				const url = new URL(imageExternal);

				switch (url.origin) {
					case this.#config.image_external.amazon.origin: {
						/* Amazon */
						const paapi5ItemImageUrlParser = new PaapiItemImageUrlParser(new URL(imageExternal));
						paapi5ItemImageUrlParser.setSize(this.#config.image_external.amazon.size);

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
		const html = await ejs.renderFile(`${this.configCommon.views}/${this.#config.view.success}`, {
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
