import BlogEntryDao from '../dao/BlogEntryDao.js';
import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import dayjs from 'dayjs';
import fs from 'fs';
import HttpResponse from '../util/HttpResponse.js';
import MessageParser from '../util/MessageParser.js';
import Sidebar from '../util/Sidebar.js';
import { BlogView } from '../../@types/view.js';
import { NoName as Configure } from '../../configure/type/entry.js';
import { NoName as ConfigureCommon } from '../../configure/type/common';
import { Request, Response } from 'express';

/**
 * 記事リスト
 */
export default class EntryController extends Controller implements ControllerInterface {
	#configCommon: ConfigureCommon;
	#config: Configure;

	/**
	 * @param {ConfigureCommon} configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super();

		this.#configCommon = configCommon;
		this.#config = <Configure>JSON.parse(fs.readFileSync('node/configure/entry.json', 'utf8'));
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const paramEntryId = Number(req.params.entry_id);

		const httpResponse = new HttpResponse(req, res, this.#configCommon);
		const dao = new BlogEntryDao(this.#configCommon);

		/* 最終更新日時をセット */
		if (httpResponse.checkLastModified(req, await dao.getLastModified())) {
			return;
		}

		/* DB からデータ取得 */
		const entryDto = await dao.getEntry(paramEntryId);

		if (entryDto === null) {
			httpResponse.send404();
			return;
		}

		const sidebar = new Sidebar(dao);

		const [categoryDataListDto, relationDataListDto, entryCountOfCategoryListDto, newlyEntriesDto] = await Promise.all([
			dao.getCategories(paramEntryId),
			dao.getRelations(paramEntryId),
			sidebar.getEntryCountOfCategory(),
			sidebar.getNewlyEntries(this.#config.sidebar.newly.maximum_number),
		]);

		const messageParser = new MessageParser(this.#configCommon, await dao.getDbh(), paramEntryId);

		let ogImage: string | null = null;
		if (entryDto.image_internal !== null) {
			ogImage = `https://media.w0s.jp/image/blog/${entryDto.image_internal}`;
		} else if (entryDto.image_external !== null) {
			ogImage = entryDto.image_external;
		}

		const relationDataList: BlogView.EntryData[] = [];
		for (const relationData of relationDataListDto) {
			relationDataList.push({
				id: relationData.id,
				title: relationData.title,
				image_internal: relationData.image_internal,
				image_external: relationData.image_external,
				created: dayjs(relationData.created),
			});
		}

		res.render(this.#config.view.success, {
			page: {
				path: req.path,
			},
			entryId: paramEntryId,
			title: entryDto.title,
			message: await messageParser.toHtml(entryDto.message),
			description: entryDto.description,
			created: dayjs(entryDto.created_at),
			lastUpdated: entryDto.updated_at !== null ? dayjs(entryDto.updated_at) : null,

			ogImage: ogImage,
			tweet: messageParser.isTweetExit(),

			categories: categoryDataListDto.map((categoryData) => categoryData.name),
			relations: relationDataList,
			book: categoryDataListDto[0]?.book ?? null,
			sidebarAmazon: categoryDataListDto[0]?.sidebar_amazon ?? null,

			entryCountOfCategoryList: entryCountOfCategoryListDto,
			newlyEntries: newlyEntriesDto,
		});
	}
}
