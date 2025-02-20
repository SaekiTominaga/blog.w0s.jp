import dayjs from 'dayjs';
import ejs from 'ejs';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import configEntry from '../config/entry.js';
import configHono from '../config/hono.js';
import BlogEntryDao from '../dao/BlogEntryDao.js';
import Markdown from '../markdown/Markdown.js';
import MarkdownTitle from '../markdown/Title.js';
import { env } from '../util/env.js';
import Rendering from '../util/Rendering.js';
import Sidebar from '../util/Sidebar.js';
import { param as validatorParam } from '../validator/entry.js';

/**
 * 記事
 */

export const entryApp = new Hono().get('/:entryId{[1-9][0-9]*}', validatorParam, async (context) => {
	const { req } = context;

	const { entryId } = req.valid('param');

	const dao = new BlogEntryDao(env('SQLITE_BLOG'));

	const htmlFilePath = `${env('HTML')}/${configEntry.html.directory}/${String(entryId)}${configHono.extension.html}`;

	const rendering = new Rendering(context, await dao.getLastModified(), htmlFilePath);
	const response = await rendering.serverCache();
	if (response !== null) {
		/* サーバーのキャッシュファイルがあればそれをレスポンスで返す */
		return response;
	}

	/* DB からデータ取得 */
	const entryDto = await dao.getEntry(entryId);
	if (entryDto === null) {
		throw new HTTPException(404, { message: `無効なエントリが指定: ${String(entryId)}` });
	}

	const markdown = new Markdown();

	const sidebar = new Sidebar(dao);

	const [message, categoriesDto, relationDataListDto, entryCountOfCategoryList, newlyEntries] = await Promise.all([
		(await markdown.toHtml(entryDto.message)).value.toString(),
		dao.getCategories(entryId),
		dao.getRelations(entryId),
		sidebar.getEntryCountOfCategory(),
		sidebar.getNewlyEntries(configHono.sidebar.newly.maximumNumber),
	]);

	let imageUrl: string | undefined;
	if (entryDto.imageInternal !== undefined) {
		imageUrl = `https://media.w0s.jp/image/blog/${entryDto.imageInternal}`;
	} else if (entryDto.imageExternal !== undefined) {
		imageUrl = entryDto.imageExternal;
	}

	const relations: BlogView.EntryData[] = [];
	for (const relationData of relationDataListDto) {
		relations.push({
			id: relationData.id,
			title: new MarkdownTitle(relationData.title).mark(),
			imageInternal: relationData.imageInternal,
			imageExternal: relationData.imageExternal,
			registedAt: dayjs(relationData.registedAt),
		});
	}

	const structuredData = {
		title: entryDto.title,
		titleMarked: new MarkdownTitle(entryDto.title).mark(),
		datePublished: dayjs(entryDto.registedAt),
		dateModified: entryDto.updatedAt !== undefined ? dayjs(entryDto.updatedAt) : undefined,
		description: entryDto.description,
		image: imageUrl,
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
	const html = await ejs.renderFile(`${env('VIEWS')}/${configEntry.template}`, {
		pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
		entryId: entryId,
		structuredData: structuredData,
		jsonLd: Object.fromEntries(jsonLd),

		message: message,

		categoryNames: categoriesDto.map((category) => category.name),
		categoryFileNames: categoriesDto.map((category) => category.fileName).find((fileName) => fileName !== undefined),
		relations: relations,

		entryCountOfCategoryList: entryCountOfCategoryList,
		newlyEntries: newlyEntries,
	});

	/* レンダリング、ファイル出力 */
	return await rendering.generation(html);
});
