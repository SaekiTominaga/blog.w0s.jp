import BlogListDao from '../dao/BlogListDao.js';
import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import dayjs from 'dayjs';
import fs from 'fs';
import HttpResponse from '../util/HttpResponse.js';
import PaapiItemImageUrlParser from '@saekitominaga/paapi-item-image-url-parser';
import Sidebar from '../util/Sidebar.js';
import { BlogView } from '../../@types/view.js';
import { NoName as Configure } from '../../configure/type/list.js';
import { NoName as ConfigureCommon } from '../../configure/type/common.js';
import { Request, Response } from 'express';

/**
 * 記事リスト
 */
export default class ListController extends Controller implements ControllerInterface {
	#configCommon: ConfigureCommon;
	#config: Configure;

	/**
	 * @param {ConfigureCommon} configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super();

		this.#configCommon = configCommon;
		this.#config = <Configure>JSON.parse(fs.readFileSync('node/configure/list.json', 'utf8'));
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const paramPage = req.params.page !== undefined ? Number(req.params.page) : 1;

		this.logger.debug('page', paramPage);

		const httpResponse = new HttpResponse(res, this.#configCommon);
		const dao = new BlogListDao(this.#configCommon);

		/* 最終更新日時をセット */
		if (httpResponse.checkLastModified(req, await dao.getLastModified())) {
			return;
		}

		/* DB からデータ取得 */
		const entriesDto = await dao.getEntries(paramPage, this.#config.maximum_number);
		if (entriesDto.length === 0) {
			this.logger.info(`無効なページが指定: ${paramPage}`);
			httpResponse.send404();
			return;
		}

		const sidebar = new Sidebar(dao);

		const [entryCount, entryCountOfCategoryListDto, newlyEntriesDto] = await Promise.all([
			dao.getEntryCount(),
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

		const totalPage = Math.ceil(entryCount / this.#config.maximum_number);

		/* レンダリング */
		res.render(this.#config.view.success, {
			url: req.url,
			page: paramPage,
			totalPage: totalPage,
			entries: entries,
			entryCountOfCategoryList: entryCountOfCategoryListDto,
			newlyEntries: newlyEntriesDto,
		});
	}
}
