import BlogTopicDao from '../dao/BlogTopicDao.js';
import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import dayjs from 'dayjs';
import fs from 'fs';
import HttpResponse from '../util/HttpResponse.js';
import MessageParser from '../util/MessageParser.js';
import Sidebar from '../util/Sidebar.js';
import { BlogView } from '../../@types/view.js';
import { NoName as Configure } from '../../configure/type/topic.js';
import { NoName as ConfigureCommon } from '../../configure/type/common.js';
import { Request, Response } from 'express';

/**
 * 記事リスト
 */
export default class TopicController extends Controller implements ControllerInterface {
	#configCommon: ConfigureCommon;
	#config: Configure;

	/**
	 * @param {ConfigureCommon} configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super();

		this.#configCommon = configCommon;
		this.#config = <Configure>JSON.parse(fs.readFileSync('node/configure/topic.json', 'utf8'));
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const paramTopicId = Number(req.params.topic_id);

		this.logger.debug('topic_id', paramTopicId);

		const httpResponse = new HttpResponse(res, this.#configCommon);
		const dao = new BlogTopicDao(this.#configCommon);

		/* 最終更新日時をセット */
		if (httpResponse.checkLastModified(req, await dao.getLastModified())) {
			return;
		}

		/* DB からデータ取得 */
		const topicDataDto = await dao.getTopic(paramTopicId);

		if (topicDataDto === null) {
			httpResponse.send404();
			return;
		}

		const sidebar = new Sidebar(dao);

		Promise.all([
			dao.getCategories(paramTopicId),
			dao.getRelations(paramTopicId),
			sidebar.getTopicCountOfCategory(),
			sidebar.getNewlyTopicData(this.#config.sidebar.newly.maximum_number),
		]).then(async (values) => {
			const categoryDataListDto = values[0];
			const relationDataListDto = values[1];
			const topicCountOfCategoryListDto = values[2];
			const newlyTopicDataListDto = values[3];

			const messageParser = new MessageParser(this.#configCommon, await dao.getDbh(), paramTopicId);

			let ogImage: string | null = null;
			if (topicDataDto.image_internal !== null) {
				ogImage = `https://media.w0s.jp/image/blog/${topicDataDto.image_internal}`;
			} else if (topicDataDto.image_external !== null) {
				ogImage = topicDataDto.image_external;
			}

			const relationDataList: BlogView.TopicData[] = [];
			for (const relationData of relationDataListDto) {
				relationDataList.push({
					id: relationData.id,
					title: relationData.title,
					image_internal: relationData.image_internal,
					image_external: relationData.image_external,
					insert_date: dayjs(relationData.insert_date),
				});
			}

			res.render(this.#config.view.success, {
				url: req.url,
				topicId: paramTopicId,
				title: topicDataDto.title,
				message: await messageParser.toHtml(<string>topicDataDto.message),
				description: topicDataDto.description,
				insert: dayjs(topicDataDto.insert_date),
				lastUpdated: topicDataDto.last_update !== null ? dayjs(topicDataDto.last_update) : null,

				ogImage: ogImage,
				tweet: messageParser.isTweetExit(),

				categories: categoryDataListDto.map((categoryData) => categoryData.name),
				relations: relationDataList,
				book: categoryDataListDto[0].book,
				sidebarAmazon: categoryDataListDto[0].sidebar_amazon,

				topicCountOfCategoryList: topicCountOfCategoryListDto,
				newlyTopicDataList: newlyTopicDataListDto,
			});
		});
	}
}
