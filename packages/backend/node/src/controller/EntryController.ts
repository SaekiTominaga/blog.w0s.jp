import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import type { Request, Response } from 'express';
import BlogEntryDao from '../dao/BlogEntryDao.js';
import Controller from '../Controller.js';
import type ControllerInterface from '../ControllerInterface.js';
import Markdown from '../markdown/Markdown.js';
import MarkdownTitle from '../markdown/Title.js';
import HttpResponse from '../util/HttpResponse.js';
import RequestUtil from '../util/RequestUtil.js';
import Sidebar from '../util/Sidebar.js';
import type { NoName as ConfigureCommon } from '../../../configure/type/common.js';
import type { NoName as Configure } from '../../../configure/type/entry.js';

/**
 * 記事
 */
export default class EntryController extends Controller implements ControllerInterface {
	#config: Configure;

	/**
	 * @param configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super(configCommon);

		this.#config = JSON.parse(fs.readFileSync('configure/entry.json', 'utf8'));
	}

	/**
	 * @param req - Request
	 * @param res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const httpResponse = new HttpResponse(req, res, this.configCommon);

		const requestQuery: BlogRequest.Entry = {
			entry_id: RequestUtil.number(req.params['entry_id'])!,
		};

		const dao = new BlogEntryDao(this.configCommon.sqlite.db.blog);

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

		const markdown = new Markdown();

		const sidebar = new Sidebar(dao);

		const [message, categoriesDto, relationDataListDto, entryCountOfCategoryList, newlyEntries] = await Promise.all([
			(await markdown.toHtml(entryDto.message)).value.toString(),
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
				title: new MarkdownTitle(relationData.title).mark(),
				image_internal: relationData.image_internal,
				image_external: relationData.image_external,
				created: dayjs(relationData.created),
			});
		}

		const structuredData = {
			title: entryDto.title,
			title_marked: new MarkdownTitle(entryDto.title).mark(),
			datePublished: dayjs(entryDto.created_at),
			dateModified: entryDto.updated_at !== null ? dayjs(entryDto.updated_at) : undefined,
			description: entryDto.description ?? undefined,
			image: imageUrl ?? undefined,
		}; // 構造データ

		const jsonLd = new Map<string, string | string[] | object>([
			['@context', 'https://schema.org/'],
			['@type', 'BlogPosting'],
		]);
		jsonLd.set('datePublished', structuredData.datePublished.format('YYYY-MM-DDTHH:mm:ssZ'));
		if (structuredData.dateModified !== undefined) {
			jsonLd.set('dateModified', structuredData.dateModified.format('YYYY-MM-DDTHH:mm:ssZ'));
		}
		jsonLd.set('headline', structuredData.title);
		if (structuredData.description !== undefined) {
			jsonLd.set('description', structuredData.description);
		}
		if (structuredData.image !== undefined) {
			jsonLd.set('image', structuredData.image);
		}

		/* HTML 生成 */
		const html = await ejs.renderFile(`${this.configCommon.views}/${this.#config.view.success}`, {
			pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
			requestQuery: requestQuery,
			structuredData: structuredData,
			jsonLd: Object.fromEntries(jsonLd),

			message: message,

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
