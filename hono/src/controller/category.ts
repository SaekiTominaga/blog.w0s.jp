import dayjs from 'dayjs';
import ejs from 'ejs';
import filenamify from 'filenamify';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { env } from '@w0s/env-value-type';
import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';
// eslint-disable-next-line import/extensions
import MarkdownTitle from '@blog.w0s.jp/remark/dist/Title.js';
import configCategory from '../config/category.ts';
import configHono from '../config/hono.ts';
import CategoryDao from '../db/Category.ts';
import Rendering from '../util/Rendering.ts';
import Sidebar from '../util/Sidebar.ts';
import { param as validatorParam } from '../validator/category.ts';

/**
 * カテゴリー
 */

export const categoryApp = new Hono().get('/:categoryName', validatorParam, async (context) => {
	const { req } = context;

	const { categoryName } = req.valid('param');

	const dao = new CategoryDao(env('SQLITE_BLOG'), {
		readonly: true,
	});

	const htmlFilePath = `${env('HTML')}/${configCategory.html.directory}/${filenamify(categoryName)}${configHono.extension.html}`;

	const rendering = new Rendering(context, await dao.getLastModified(), htmlFilePath);
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
		let { image_external: imageExternal } = entryDto;
		if (imageExternal !== undefined) {
			switch (imageExternal.origin) {
				case configCategory.imageExternal.amazon.origin: {
					/* Amazon */
					const paapi5ItemImageUrlParser = new PaapiItemImageUrlParser(imageExternal);
					paapi5ItemImageUrlParser.setSize(configCategory.imageExternal.amazon.size);

					imageExternal = paapi5ItemImageUrlParser.getURL();
					break;
				}
				default:
			}
		}

		entries.push({
			id: entryDto.id,
			title: new MarkdownTitle(entryDto.title).mark(),
			imageInternal: entryDto.image_internal,
			imageExternal: imageExternal,
			registedAt: dayjs(entryDto.registed_at),
			updatedAt: entryDto.updated_at !== undefined ? dayjs(entryDto.updated_at) : undefined,
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
