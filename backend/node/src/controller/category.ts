import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import type { Request, Response } from 'express';
import filenamify from 'filenamify';
import Log4js from 'log4js';
import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';
import configExpress from '../config/express.js';
import configCategory from '../config/category.js';
import BlogCategoryDao from '../dao/BlogCategoryDao.js';
import MarkdownTitle from '../markdown/Title.js';
import { env } from '../util/env.js';
import { rendering, generation, checkLastModified, rendering404 } from '../util/response.js';
import Sidebar from '../util/Sidebar.js';

const logger = Log4js.getLogger('category');

/**
 * カテゴリー
 *
 * @param req - Request
 * @param res - Response
 */
const execute = async (req: Request, res: Response): Promise<void> => {
	const requestQuery: BlogRequest.Category = {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		category_name: req.params['category_name']!,
	};

	const dao = new BlogCategoryDao(env('SQLITE_BLOG'));

	const lastModified = await dao.getLastModified();

	/* 最終更新日時をセット */
	if (checkLastModified(req, res, lastModified)) {
		return;
	}

	const htmlFilePath = `${env('HTML')}/${configCategory.html.directory}/${filenamify(requestQuery.category_name)}${configExpress.extension.html}`;
	const htmlBrotliFilePath = `${htmlFilePath}${configExpress.extension.brotli}`;

	if (fs.existsSync(htmlFilePath) && lastModified <= (await fs.promises.stat(htmlFilePath)).mtime) {
		/* 生成された HTML をロードする */
		await rendering(req, res, { htmlPath: htmlFilePath, brotliPath: htmlBrotliFilePath });
		return;
	}

	/* DB からデータ取得 */
	const entriesDto = await dao.getEntries(requestQuery.category_name);

	if (entriesDto.length === 0) {
		logger.info(`無効なカテゴリが指定: ${requestQuery.category_name}`);
		rendering404(res);
		return;
	}

	const sidebar = new Sidebar(dao);

	const [entryCountOfCategoryList, newlyEntries] = await Promise.all([
		sidebar.getEntryCountOfCategory(),
		sidebar.getNewlyEntries(configExpress.sidebar.newly.maximumNumber),
	]);

	const entries: BlogView.EntryData[] = [];
	for (const entryDto of entriesDto) {
		let imageExternal = entryDto.image_external;
		if (imageExternal !== null) {
			const url = new URL(imageExternal);

			switch (url.origin) {
				case configCategory.imageExternal.amazon.origin: {
					/* Amazon */
					const paapi5ItemImageUrlParser = new PaapiItemImageUrlParser(new URL(imageExternal));
					paapi5ItemImageUrlParser.setSize(configCategory.imageExternal.amazon.size);

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

	/* HTML 生成 */
	const html = await ejs.renderFile(`${env('VIEWS')}/${configCategory.template}`, {
		pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
		requestQuery: requestQuery,
		count: entries.length,
		entries: entries,
		entryCountOfCategoryList: entryCountOfCategoryList,
		newlyEntries: newlyEntries,
	});

	/* レンダリング、ファイル出力 */
	await generation(req, res, html, {
		htmlPath: htmlFilePath,
		brotliPath: htmlBrotliFilePath,
	});
};

export default execute;
