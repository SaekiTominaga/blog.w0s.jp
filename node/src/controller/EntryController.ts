import BlogEntryDao from '../dao/BlogEntryDao.js';
import Compress from '../util/Compress.js';
import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import dayjs from 'dayjs';
import ejs from 'ejs';
import fs from 'fs';
import HttpResponse from '../util/HttpResponse.js';
import MessageParser from '../util/MessageParser.js';
import prettier from 'prettier';
import RequestUtil from '../util/RequestUtil.js';
import Sidebar from '../util/Sidebar.js';
import { NoName as Configure } from '../../configure/type/entry.js';
import { NoName as ConfigureCommon } from '../../configure/type/common.js';
import { Request, Response } from 'express';

/**
 * 記事
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
		const httpResponse = new HttpResponse(req, res, this.#configCommon);

		const requestQuery: BlogRequest.Entry = {
			entry_id: <number>RequestUtil.number(req.params.entry_id),
		};

		const dao = new BlogEntryDao(this.#configCommon);

		const lastModified = await dao.getLastModified();

		/* 最終更新日時をセット */
		if (httpResponse.checkLastModified(lastModified)) {
			return;
		}

		const htmlFilePath = `${this.#config.html.directory}/${requestQuery.entry_id}.${this.#config.html.extension}`;
		const htmlBrotliFilePath = `${htmlFilePath}.${this.#config.html.brotli_extension}`;

		if (fs.existsSync(htmlFilePath) && lastModified <= (await fs.promises.stat(htmlFilePath)).mtime) {
			/* 生成された HTML をロードする */
			await httpResponse.send200({ filePath: htmlFilePath, brotliFilePath: htmlBrotliFilePath });
			return;
		}

		/* DB からデータ取得 */
		const entryDto = await dao.getEntry(requestQuery.entry_id);

		if (entryDto === null) {
			httpResponse.send404();
			return;
		}

		const messageParser = new MessageParser(this.#configCommon, await dao.getDbh(), requestQuery.entry_id);

		const sidebar = new Sidebar(dao);

		const [message, categoriesDto, relationDataListDto, entryCountOfCategoryListDto, newlyEntriesDto] = await Promise.all([
			messageParser.toHtml(entryDto.message),
			dao.getCategories(requestQuery.entry_id),
			dao.getRelations(requestQuery.entry_id),
			sidebar.getEntryCountOfCategory(),
			sidebar.getNewlyEntries(this.#configCommon.sidebar.newly.maximum_number),
		]);

		let ogImage: string | null = null;
		if (entryDto.image_internal !== null) {
			ogImage = `https://media.w0s.jp/image/blog/${entryDto.image_internal}`;
		} else if (entryDto.image_external !== null) {
			ogImage = entryDto.image_external;
		}

		const relations: BlogView.EntryData[] = [];
		for (const relationData of relationDataListDto) {
			relations.push({
				id: relationData.id,
				title: relationData.title,
				image_internal: relationData.image_internal,
				image_external: relationData.image_external,
				created: dayjs(relationData.created),
			});
		}

		/* HTML 生成 */
		const html = await ejs.renderFile(`${this.#configCommon.views}/${this.#config.view.success}`, {
			page: {
				path: req.path,
				query: requestQuery,
			},
			title: entryDto.title,
			message: message,
			description: entryDto.description,
			created: dayjs(entryDto.created_at),
			lastUpdated: entryDto.updated_at !== null ? dayjs(entryDto.updated_at) : null,

			ogImage: ogImage,
			tweet: messageParser.isTweetExit(),

			categoryNames: categoriesDto.map((category) => category.name),
			categoryFileNames: categoriesDto
				.map((category) => category.file_name)
				.filter((fileName) => fileName !== null)
				.at(0),
			relations: relations,

			entryCountOfCategoryList: entryCountOfCategoryListDto,
			newlyEntries: newlyEntriesDto,
		});

		let htmlFormatted = '';
		try {
			htmlFormatted = prettier.format(html, <prettier.Options>this.#configCommon.prettier.html).trim();
		} catch (e) {
			this.logger.error('Prettier failed', e);
			htmlFormatted = html;
		}

		/* レンダリング、ファイル出力 */
		const htmlBrotli = Compress.brotliText(htmlFormatted);

		await Promise.all([
			httpResponse.send200({ body: htmlFormatted, brotliBody: htmlBrotli }),
			fs.promises.writeFile(htmlFilePath, htmlFormatted),
			fs.promises.writeFile(htmlBrotliFilePath, htmlBrotli),
		]);
		this.logger.info('HTML file created', htmlFilePath);
		this.logger.info('HTML Brotli file created', htmlBrotliFilePath);
	}
}
