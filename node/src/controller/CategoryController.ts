import BlogCategoryDao from '../dao/BlogCategoryDao.js';
import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import dayjs from 'dayjs';
import fs from 'fs';
import HttpResponse from '../util/HttpResponse.js';
import PaapiItemImageUrlParser from '@saekitominaga/paapi-item-image-url-parser';
import Sidebar from '../util/Sidebar.js';
import { BlogView } from '../../@types/view.js';
import { NoName as Configure } from '../../configure/type/category.js';
import { NoName as ConfigureCommon } from '../../configure/type/common.js';
import { Request, Response } from 'express';

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
		const paramCategoryName = <string>req.params.category_name;

		const httpResponse = new HttpResponse(res, this.#configCommon);
		const dao = new BlogCategoryDao(this.#configCommon);

		/* 最終更新日時をセット */
		if (httpResponse.checkLastModified(req, await dao.getLastModified())) {
			return;
		}

		/* DB からデータ取得 */
		const entriesDto = await dao.getEntries(paramCategoryName);

		if (entriesDto.length === 0) {
			this.logger.info(`無効なカテゴリが指定: ${paramCategoryName}`);
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
		res.render(this.#config.view.success, {
			url: req.url,
			categoryName: paramCategoryName,
			count: entries.length,
			entries: entries,
			entryCountOfCategoryList: entryCountOfCategoryListDto,
			newlyEntries: newlyEntriesDto,
		});
	}
}
