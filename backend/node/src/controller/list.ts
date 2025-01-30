import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import type { Request, Response } from 'express';
import Log4js from 'log4js';
import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';
import configExpress from '../config/express.js';
import configList from '../config/list.js';
import BlogListDao from '../dao/BlogListDao.js';
import MarkdownTitle from '../markdown/Title.js';
import { env } from '../util/env.js';
import { rendering, generation, checkLastModified, rendering404 } from '../util/response.js';
import Sidebar from '../util/Sidebar.js';

const logger = Log4js.getLogger('list');

/**
 * 記事リスト
 *
 * @param req - Request
 * @param res - Response
 */
const execute = async (req: Request, res: Response): Promise<void> => {
	const requestQuery: BlogRequest.List = {
		page: req.params['page'] !== undefined ? Number(req.params['page']) : 1,
	};

	const dao = new BlogListDao(env('SQLITE_BLOG'));

	const lastModified = await dao.getLastModified();

	/* 最終更新日時をセット */
	if (checkLastModified(req, res, lastModified)) {
		return;
	}

	const htmlFilePath = `${env('HTML')}/${configList.html.directory}/${String(requestQuery.page)}${configExpress.extension.html}`;
	const htmlBrotliFilePath = `${htmlFilePath}${configExpress.extension.brotli}`;

	if (fs.existsSync(htmlFilePath) && lastModified <= (await fs.promises.stat(htmlFilePath)).mtime) {
		/* 生成された HTML をロードする */
		await rendering(req, res, { htmlPath: htmlFilePath, brotliPath: htmlBrotliFilePath });
		return;
	}

	/* DB からデータ取得 */
	const entriesDto = await dao.getEntries(requestQuery.page, configList.maximum);
	if (entriesDto.length === 0) {
		logger.info(`無効なページが指定: ${String(requestQuery.page)}`);
		rendering404(res);
		return;
	}

	const sidebar = new Sidebar(dao);

	const [entryCount, entryCountOfCategoryList, newlyEntries] = await Promise.all([
		dao.getEntryCount(),
		sidebar.getEntryCountOfCategory(),
		sidebar.getNewlyEntries(configExpress.sidebar.newly.maximumNumber),
	]);

	const entries: BlogView.EntryData[] = [];
	for (const entryDto of entriesDto) {
		let imageExternal = entryDto.image_external;
		if (imageExternal !== null) {
			const url = new URL(imageExternal);

			switch (url.origin) {
				case configList.imageExternal.amazon.origin: {
					/* Amazon */
					const paapi5ItemImageUrlParser = new PaapiItemImageUrlParser(new URL(imageExternal));
					paapi5ItemImageUrlParser.setSize(configList.imageExternal.amazon.size);

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

	const totalPage = Math.ceil(entryCount / configList.maximum);

	/* HTML 生成 */
	const html = await ejs.renderFile(`${env('VIEWS')}/${configList.template}`, {
		pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
		requestQuery: requestQuery,
		totalPage: totalPage,
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
