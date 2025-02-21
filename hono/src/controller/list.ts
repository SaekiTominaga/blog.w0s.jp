import dayjs from 'dayjs';
import ejs from 'ejs';
import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';
import configHono from '../config/hono.js';
import configList from '../config/list.js';
import BlogListDao from '../dao/BlogListDao.js';
import MarkdownTitle from '../markdown/Title.js';
import { env } from '../util/env.js';
import Rendering from '../util/Rendering.js';
import Sidebar from '../util/Sidebar.js';
import { param as validatorParam } from '../validator/list.js';

/**
 * 記事リスト
 */

const commonProcess = async (context: Context, page = 1): Promise<Response> => {
	const { req } = context;

	const dao = new BlogListDao(env('SQLITE_BLOG'));

	const htmlFilePath = `${env('HTML')}/${configList.html.directory}/${String(page)}${configHono.extension.html}`;

	const rendering = new Rendering(context, await dao.getLastModified(), htmlFilePath);
	const response = await rendering.serverCache();
	if (response !== null) {
		/* サーバーのキャッシュファイルがあればそれをレスポンスで返す */
		return response;
	}

	/* DB からデータ取得 */
	const entriesDto = await dao.getEntries(page, configList.maximum);
	if (entriesDto.length === 0) {
		throw new HTTPException(404, { message: `無効なページが指定: ${String(page)}` });
	}

	const sidebar = new Sidebar(dao);

	const [entryCount, entryCountOfCategoryList, newlyEntries] = await Promise.all([
		dao.getEntryCount(),
		sidebar.getEntryCountOfCategory(),
		sidebar.getNewlyEntries(configHono.sidebar.newly.maximumNumber),
	]);

	const entries: BlogView.EntryData[] = [];
	for (const entryDto of entriesDto) {
		let { imageExternal } = entryDto;
		if (imageExternal !== undefined) {
			const url = new URL(imageExternal);

			switch (url.origin) {
				case configList.imageExternal.amazon.origin: {
					/* Amazon */
					const paapi5ItemImageUrlParser = new PaapiItemImageUrlParser(new URL(imageExternal));
					paapi5ItemImageUrlParser.setSize(configList.imageExternal.amazon.size);

					imageExternal = paapi5ItemImageUrlParser.getURL();
					break;
				}
				default:
			}
		}

		entries.push({
			id: entryDto.id,
			title: new MarkdownTitle(entryDto.title).mark(),
			imageInternal: entryDto.imageInternal,
			imageExternal: imageExternal,
			registedAt: dayjs(entryDto.registedAt),
			updatedAt: entryDto.updatedAt !== undefined ? dayjs(entryDto.updatedAt) : undefined,
		});
	}

	const totalPage = Math.ceil(entryCount / configList.maximum);

	/* HTML 生成 */
	const html = await ejs.renderFile(`${env('VIEWS')}/${configList.template}`, {
		pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
		page: page,
		totalPage: totalPage,
		entries: entries,
		entryCountOfCategoryList: entryCountOfCategoryList,
		newlyEntries: newlyEntries,
	});

	/* レンダリング、ファイル出力 */
	return await rendering.generation(html);
};

export const topApp = new Hono().get('/', async (context) => commonProcess(context));

export const listApp = new Hono().get('/:page{[1-9][0-9]*}', validatorParam, async (context) => {
	const { req } = context;

	const { page } = req.valid('param');

	return commonProcess(context, page);
});
