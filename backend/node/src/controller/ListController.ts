import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';
import type { Request, Response } from 'express';
import BlogListDao from '../dao/BlogListDao.js';
import Controller from '../Controller.js';
import type ControllerInterface from '../ControllerInterface.js';
import configureExpress from '../config/express.js';
import MarkdownTitle from '../markdown/Title.js';
import { env } from '../util/env.js';
import HttpResponse from '../util/HttpResponse.js';
import Sidebar from '../util/Sidebar.js';
import type { NoName as Configure } from '../../../configure/type/list.js';

/**
 * 記事リスト
 */
export default class ListController extends Controller implements ControllerInterface {
	#config: Configure;

	constructor() {
		super();

		this.#config = JSON.parse(fs.readFileSync('configure/list.json', 'utf8')) as Configure;
	}

	/**
	 * @param req - Request
	 * @param res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const httpResponse = new HttpResponse(req, res);

		const requestQuery: BlogRequest.List = {
			page: req.params['page'] !== undefined ? Number(req.params['page']) : 1,
		};

		const dao = new BlogListDao(env('SQLITE_BLOG'));

		const lastModified = await dao.getLastModified();

		/* 最終更新日時をセット */
		if (httpResponse.checkLastModified(lastModified)) {
			return;
		}

		const htmlFilePath = `${env('HTML')}/${this.#config.html.directory}/${String(requestQuery.page)}${configureExpress.extension.html}`;
		const htmlBrotliFilePath = `${htmlFilePath}${configureExpress.extension.brotli}`;

		if (fs.existsSync(htmlFilePath) && lastModified <= (await fs.promises.stat(htmlFilePath)).mtime) {
			/* 生成された HTML をロードする */
			await httpResponse.send200({ filePath: htmlFilePath, brotliFilePath: htmlBrotliFilePath, cacheControl: configureExpress.cacheControl });
			return;
		}

		/* DB からデータ取得 */
		const entriesDto = await dao.getEntries(requestQuery.page, this.#config.maximum_number);
		if (entriesDto.length === 0) {
			this.logger.info(`無効なページが指定: ${String(requestQuery.page)}`);
			httpResponse.send404();
			return;
		}

		const sidebar = new Sidebar(dao);

		const [entryCount, entryCountOfCategoryList, newlyEntries] = await Promise.all([
			dao.getEntryCount(),
			sidebar.getEntryCountOfCategory(),
			sidebar.getNewlyEntries(configureExpress.sidebar.newly.maximumNumber),
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

		const totalPage = Math.ceil(entryCount / this.#config.maximum_number);

		/* HTML 生成 */
		const html = await ejs.renderFile(`${env('VIEWS')}/${this.#config.view.success}`, {
			pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
			requestQuery: requestQuery,
			totalPage: totalPage,
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
