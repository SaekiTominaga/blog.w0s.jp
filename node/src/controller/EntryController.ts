import dayjs from 'dayjs';
import ejs from 'ejs';
import fs from 'fs';
import { Request, Response } from 'express';
import BlogEntryDao from '../dao/BlogEntryDao.js';
import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import HttpResponse from '../util/HttpResponse.js';
import MessageParser from '../util/MessageParser.js';
import RequestUtil from '../util/RequestUtil.js';
import Sidebar from '../util/Sidebar.js';
import MessageParserInline from '../util/@message/Inline.js';
import { NoName as ConfigureCommon } from '../../configure/type/common.js';
import { NoName as Configure } from '../../configure/type/entry.js';
import { NoName as ConfigureMessage } from '../../configure/type/message.js';
import { PAAPI as ConfigurePaapi } from '../../configure/type/paapi.js';

/**
 * 記事
 */
export default class EntryController extends Controller implements ControllerInterface {
	#config: Configure;

	#configureMessage: ConfigureMessage;

	#configPaapi: ConfigurePaapi;

	/**
	 * @param {ConfigureCommon} configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super(configCommon);

		this.#config = JSON.parse(fs.readFileSync('node/configure/entry.json', 'utf8'));
		this.#configureMessage = JSON.parse(fs.readFileSync('node/configure/message.json', 'utf8'));
		this.#configPaapi = JSON.parse(fs.readFileSync('node/configure/paapi.json', 'utf8'));
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const httpResponse = new HttpResponse(req, res, this.configCommon);

		const requestQuery: BlogRequest.Entry = {
			entry_id: <number>RequestUtil.number(req.params['entry_id']),
		};

		const dao = new BlogEntryDao(this.configCommon);

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

		const messageParser = new MessageParser(this.configCommon, {
			entry_id: requestQuery.entry_id,
			dbh: await dao.getDbh(),
			anchor_host_icons: this.#configureMessage.anchor_host_icon,
			amazon_tracking_id: this.#configPaapi.partner_tag,
		});

		const messageParserInline = new MessageParserInline(this.configCommon);

		const sidebar = new Sidebar(dao, messageParserInline);

		const [message, categoriesDto, relationDataListDto, entryCountOfCategoryList, newlyEntries] = await Promise.all([
			messageParser.toHtml(entryDto.message),
			dao.getCategories(requestQuery.entry_id),
			dao.getRelations(requestQuery.entry_id),
			sidebar.getEntryCountOfCategory(),
			sidebar.getNewlyEntries(this.configCommon.sidebar.newly.maximum_number),
		]);

		let imageUrl: string | null = null;
		if (entryDto.image_internal !== null) {
			imageUrl = `https://media.w0s.jp/image/blog/${entryDto.image_internal}`;
		} else if (entryDto.image_external !== null) {
			imageUrl = entryDto.image_external;
		}

		const relations: BlogView.EntryData[] = [];
		for (const relationData of relationDataListDto) {
			relations.push({
				id: relationData.id,
				title: messageParserInline.mark(relationData.title, { code: true }),
				image_internal: relationData.image_internal,
				image_external: relationData.image_external,
				created: dayjs(relationData.created),
			});
		}

		const jsonLd: Map<string, string | string[]> = new Map([
			['@context', 'https://schema.org/'],
			['@type', 'BlogPosting'],
		]);
		jsonLd.set('datePublished', dayjs(entryDto.created_at).format('YYYY-MM-DDTHH:mm:ssZ'));
		if (entryDto.updated_at !== null) {
			jsonLd.set('dateModified', dayjs(entryDto.updated_at).format('YYYY-MM-DDTHH:mm:ssZ'));
		}
		jsonLd.set('headline', entryDto.title);
		if (entryDto.description !== null) {
			jsonLd.set('description', entryDto.description);
		}
		if (imageUrl !== null) {
			jsonLd.set('image', imageUrl);
		}

		/* HTML 生成 */
		const html = await ejs.renderFile(`${this.configCommon.views}/${this.#config.view.success}`, {
			page: {
				path: req.path,
				query: requestQuery,
			},
			title: entryDto.title,
			title_marked: messageParserInline.mark(entryDto.title, { code: true }),
			description: entryDto.description,
			created: dayjs(entryDto.created_at),
			lastUpdated: entryDto.updated_at !== null ? dayjs(entryDto.updated_at) : null,
			jsonLd: JSON.stringify(Object.fromEntries(jsonLd)),
			message: message,

			ogImage: imageUrl,
			tweet: messageParser.isTweetExit(),

			categoryNames: categoriesDto.map((category) => category.name),
			categoryFileNames: categoriesDto
				.map((category) => category.file_name)
				.filter((fileName) => fileName !== null)
				.at(0),
			relations: relations,

			entryCountOfCategoryList: entryCountOfCategoryList,
			newlyEntries: newlyEntries,
		});

		/* レンダリング、ファイル出力 */
		await this.response(html, {
			filePath: htmlFilePath,
			brotliFilePath: htmlBrotliFilePath,
			prettierConfig: this.configCommon.prettier.config,
			httpResponse: httpResponse,
		});
	}
}
