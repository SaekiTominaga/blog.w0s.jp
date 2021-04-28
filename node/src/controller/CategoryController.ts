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
		const paramCategoryName = req.params.category_name;

		this.logger.debug('category_name', paramCategoryName);

		const httpResponse = new HttpResponse(res, this.#configCommon);
		const dao = new BlogCategoryDao();

		/* 最終更新日時をセット */
		if (httpResponse.checkLastModified(req, await dao.getLastModified())) {
			return;
		}

		/* DB からデータ取得 */
		const topicDataListDto = await dao.getTopics(paramCategoryName);

		if (topicDataListDto.length === 0) {
			this.logger.info(`無効なカテゴリが指定: ${paramCategoryName}`);
			httpResponse.send404();
			return;
		}

		const sidebar = new Sidebar(dao);

		Promise.all([sidebar.getTopicCountOfCategory(), sidebar.getNewlyTopicData(this.#config.sidebar.newly.maximum_number)]).then((values) => {
			const topicCountOfCategoryListDto = values[0];
			const newlyTopicDataListDto = values[1];

			const topicDataList: BlogView.TopicData[] = [];
			for (const topicData of topicDataListDto) {
				let imageExternal = topicData.image_external;
				if (imageExternal !== null && imageExternal.startsWith('https://m.media-amazon.com/')) {
					/* Amazon 商品画像の場合 */
					const paapi5ItemImageUrlParser = new PaapiItemImageUrlParser(new URL(imageExternal));
					paapi5ItemImageUrlParser.setSize(this.#config.amazon_image_size);

					imageExternal = paapi5ItemImageUrlParser.toString();
				}

				topicDataList.push({
					id: topicData.id,
					title: topicData.title,
					image_internal: topicData.image_internal,
					image_external: imageExternal,
					insert_date: dayjs(topicData.insert_date),
					last_update: topicData.last_update !== null ? dayjs(topicData.last_update) : null,
				});
			}

			/* レンダリング */
			res.render(this.#config.view.success, {
				url: req.url,
				categoryName: paramCategoryName,
				count: topicDataList.length,
				topicDataList: topicDataList,
				topicCountOfCategoryList: topicCountOfCategoryListDto,
				newlyTopicDataList: newlyTopicDataListDto,
			});
		});
	}
}
