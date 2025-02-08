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
import Rendering from '../util/Rendering.js';
import Sidebar from '../util/Sidebar.js';
import { param as validatorParam } from '../validator/category.js';

/**
 * カテゴリー
 */

export const categoryApp = new Hono().get('/:categoryName', validatorParam, async (context) => {
	const { req } = context;

	const { categoryName } = req.valid('param');

	const dao = new BlogCategoryDao(env('SQLITE_BLOG'));

	const lastModified = await dao.getLastModified();

	const htmlFilePath = `${env('HTML')}/${configCategory.html.directory}/${filenamify(categoryName)}${configHono.extension.html}`;

	const rendering = new Rendering(context, lastModified, htmlFilePath);
	const response = await rendering.serverCache();
	if (response !== null) {
		/* サーバーのキャッシュファイルがあればそれをレスポンスで返す */
		return response;
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
		categoryName: categoryName,
		count: entries.length,
		entries: entries,
		entryCountOfCategoryList: entryCountOfCategoryList,
		newlyEntries: newlyEntries,
	});

	/* レンダリング、ファイル出力 */
	return await rendering.generation(html);
});
