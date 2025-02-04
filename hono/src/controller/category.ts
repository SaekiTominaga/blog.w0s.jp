import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import filenamify from 'filenamify';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';
import configHono from '../config/hono.js';
import configCategory from '../config/category.js';
import BlogCategoryDao from '../dao/BlogCategoryDao.js';
import MarkdownTitle from '../markdown/Title.js';
import { env } from '../util/env.js';
import { rendering, generation, checkLastModified } from '../util/response.js';
import Sidebar from '../util/Sidebar.js';

/**
 * カテゴリー
 */

export const categoryApp = new Hono().get('/:categoryName', async (context) => {
	const { req } = context;

	const requestParam = req.param();

	const { categoryName } = requestParam;

	const dao = new BlogCategoryDao(env('SQLITE_BLOG'));

	const lastModified = await dao.getLastModified();

	/* 最終更新日時をセット */
	const response304 = checkLastModified(context, lastModified);
	if (response304 !== null) {
		return response304;
	}

	const htmlFilePath = `${env('HTML')}/${configCategory.html.directory}/${filenamify(categoryName)}${configHono.extension.html}`;
	const htmlBrotliFilePath = `${htmlFilePath}${configHono.extension.brotli}`;

	if (fs.existsSync(htmlFilePath) && lastModified <= (await fs.promises.stat(htmlFilePath)).mtime) {
		/* 生成された HTML をロードする */
		return await rendering(context, { htmlPath: htmlFilePath, brotliPath: htmlBrotliFilePath });
	}

	/* DB からデータ取得 */
	const entriesDto = await dao.getEntries(categoryName);

	if (entriesDto.length === 0) {
		throw new HTTPException(404, { message: `無効なカテゴリが指定: ${categoryName}` });
	}

	const sidebar = new Sidebar(dao);

	const [entryCountOfCategoryList, newlyEntries] = await Promise.all([
		sidebar.getEntryCountOfCategory(),
		sidebar.getNewlyEntries(configHono.sidebar.newly.maximumNumber),
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
		requestParam: requestParam,
		count: entries.length,
		entries: entries,
		entryCountOfCategoryList: entryCountOfCategoryList,
		newlyEntries: newlyEntries,
	});

	/* レンダリング、ファイル出力 */
	return await generation(context, html, {
		htmlPath: htmlFilePath,
		brotliPath: htmlBrotliFilePath,
	});
});
