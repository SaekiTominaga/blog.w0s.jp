import BlogListDao from '../dao/BlogListDao.js';
import Compress from '../util/Compress.js';
import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import dayjs from 'dayjs';
import ejs from 'ejs';
import fs from 'fs';
import HttpResponse from '../util/HttpResponse.js';
import PaapiItemImageUrlParser from '@saekitominaga/paapi-item-image-url-parser';
import prettier from 'prettier';
import RequestUtil from '../util/RequestUtil.js';
import Sidebar from '../util/Sidebar.js';
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
		const httpResponse = new HttpResponse(req, res, this.#configCommon);

		const requestQuery: BlogRequest.List = {
			page: RequestUtil.number(req.params.page) ?? 1,
		};

		const dao = new BlogListDao(this.#configCommon);

		const lastModified = await dao.getLastModified();

		/* 最終更新日時をセット */
		if (httpResponse.checkLastModified(lastModified)) {
			return;
		}

		const htmlFilePath = `${this.#config.html.directory}/${requestQuery.page}.${this.#config.html.extension}`;
		const htmlBrotliFilePath = `${htmlFilePath}.${this.#config.html.brotli_extension}`;

		if (fs.existsSync(htmlFilePath) && lastModified <= (await fs.promises.stat(htmlFilePath)).mtime) {
			/* 生成された HTML をロードする */
			await httpResponse.send200({ filePath: htmlFilePath, brotliFilePath: htmlBrotliFilePath });
			return;
		}

		/* DB からデータ取得 */
		const entriesDto = await dao.getEntries(requestQuery.page, this.#config.maximum_number);
		if (entriesDto.length === 0) {
			this.logger.info(`無効なページが指定: ${requestQuery.page}`);
			httpResponse.send404();
			return;
		}

		const sidebar = new Sidebar(dao);

		const [entryCount, entryCountOfCategoryListDto, newlyEntriesDto] = await Promise.all([
			dao.getEntryCount(),
			sidebar.getEntryCountOfCategory(),
			sidebar.getNewlyEntries(this.#configCommon.sidebar.newly.maximum_number),
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
					case this.#config.image_external.twitter.origin: {
						/* Twitter */
						const searchParams = url.searchParams;
						for (const [name, value] of Object.entries(this.#config.image_external.twitter.params)) {
							searchParams.set(name, value);
						}
						url.search = searchParams.toString();
						imageExternal = url.toString();
						break;
					}
				}
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

		/* HTML 生成 */
		const html = await ejs.renderFile(`${this.#configCommon.views}/${this.#config.view.success}`, {
			page: {
				path: req.path,
				query: requestQuery,
			},
			totalPage: totalPage,
			entries: entries,
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
