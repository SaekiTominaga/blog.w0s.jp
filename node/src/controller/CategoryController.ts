import BlogCategoryDao from '../dao/BlogCategoryDao.js';
import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import dayjs from 'dayjs';
import fs from 'fs';
import HttpResponse from '../util/HttpResponse.js';
import PaapiItemImageUrlParser from '@saekitominaga/paapi-item-image-url-parser';
import Sidebar from '../util/Sidebar.js';
import { NoName as Configure } from '../../configure/type/category.js';
import { NoName as ConfigureCommon } from '../../configure/type/common';
import { Request, Response } from 'express';
import RequestUtil from '../util/RequestUtil.js';

/**
 * 記事リスト
 */
export default class CategoryController extends Controller implements ControllerInterface {
	#configCommon: ConfigureCommon;
	#config: Configure;

	/**
	 * @param {ConfigureCommon} configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super();

		this.#configCommon = configCommon;
		this.#config = <Configure>JSON.parse(fs.readFileSync('node/configure/category.json', 'utf8'));
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const httpResponse = new HttpResponse(req, res, this.#configCommon);

		const requestQuery: BlogRequest.Category = {
			category_name: <string>RequestUtil.string(req.params.category_name),
		};

		const dao = new BlogCategoryDao(this.#configCommon);

		/* 最終更新日時をセット */
		if (httpResponse.checkLastModified(req, await dao.getLastModified())) {
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

		const [entryCountOfCategoryListDto, newlyEntriesDto] = await Promise.all([
			sidebar.getEntryCountOfCategory(),
			sidebar.getNewlyEntries(this.#config.sidebar.newly.maximum_number),
		]);

		const entries: BlogView.EntryData[] = [];
		for (const entryDto of entriesDto) {
			let imageExternal = entryDto.image_external;
			if (imageExternal !== null && imageExternal.startsWith('https://m.media-amazon.com/')) {
				/* Amazon 商品画像の場合 */
				const paapi5ItemImageUrlParser = new PaapiItemImageUrlParser(new URL(imageExternal));
				paapi5ItemImageUrlParser.setSize(this.#config.amazon_image_size);

				imageExternal = paapi5ItemImageUrlParser.toString();
			}

			entries.push({
				id: entryDto.id,
				title: entryDto.title,
				image_internal: entryDto.image_internal,
				image_external: imageExternal,
				created: dayjs(entryDto.created),
				last_updated: entryDto.last_updated !== null ? dayjs(entryDto.last_updated) : null,
			});
		}

		/* レンダリング */
		res.setHeader('Content-Security-Policy', this.#configCommon.response.header.csp_html);
		res.setHeader('Content-Security-Policy-Report-Only', this.#configCommon.response.header.cspro_html);
		res.render(this.#config.view.success, {
			page: {
				path: req.path,
				query: requestQuery,
			},
			count: entries.length,
			entries: entries,
			entryCountOfCategoryList: entryCountOfCategoryListDto,
			newlyEntries: newlyEntriesDto,
		});
	}
}
