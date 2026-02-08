import dayjs from 'dayjs';
import ejs from 'ejs';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { env } from '@w0s/env-value-type';
import Markdown from '../../../remark/dist/Markdown.js';
import MarkdownTitle from '../../../remark/dist/Title.js';
import configEntry from '../config/entry.ts';
import configHono from '../config/hono.ts';
import EntryDao from '../db/Entry.ts';
import Rendering from '../util/Rendering.ts';
import Sidebar from '../util/Sidebar.ts';
import { param as validatorParam } from '../validator/entry.ts';
import type { Entries } from '../../@types/view.d.ts';

/**
 * 記事
 */

export const entryApp = new Hono().get('/:entryId{[1-9][0-9]*}', validatorParam, async (context) => {
	const { req } = context;

	const { entryId } = req.valid('param');

	const dao = new EntryDao(`${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`, {
		readonly: true,
	});

	const htmlFilePath = `${env('ROOT')}/${env('HTML_DIR')}/${configEntry.html.directory}/${String(entryId)}${configHono.extension.html}`;

	const rendering = new Rendering(context, await dao.getLastModified(), htmlFilePath);
	const response = await rendering.serverCache();
	if (response !== null) {
		/* サーバーのキャッシュファイルがあればそれをレスポンスで返す */
		return response;
	}

	/* DB からデータ取得 */
	const entryDto = await dao.findEntry(entryId);
	if (entryDto === undefined) {
		throw new HTTPException(404, { message: `無効なエントリが指定: ${String(entryId)}` });
	}

	const markdown = new Markdown();

	const sidebar = new Sidebar(dao);

	const [message, categoriesDto, relationDataListDto, entryCountOfCategoryList, newlyEntries] = await Promise.all([
		markdown.toHtml(entryDto.message),
		dao.getCategories(entryId),
		dao.getRelations(entryId),
		sidebar.getEntryCountOfCategory(),
		sidebar.getNewlyEntries(configHono.sidebar.newly.maximumNumber),
	]);

	let imageUrl: URL | undefined;
	if (entryDto.image_internal !== undefined) {
		imageUrl = new URL(`https://media.w0s.jp/image/blog/${entryDto.image_internal}`);
	} else if (entryDto.image_external !== undefined) {
		imageUrl = entryDto.image_external;
	}

	const relations: Entries = relationDataListDto.map((relationData) => ({
		id: relationData.id,
		title: new MarkdownTitle(relationData.title).mark(),
		imageInternal: relationData.image_internal,
		imageExternal: relationData.image_external,
		registedAt: dayjs(relationData.registed_at),
	}));

	const structuredData = {
		title: entryDto.title,
		titleMarked: new MarkdownTitle(entryDto.title).mark(),
		datePublished: dayjs(entryDto.registed_at),
		dateModified: entryDto.updated_at !== undefined ? dayjs(entryDto.updated_at) : undefined,
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
		jsonLd.set('image', structuredData.image.toString());
	}

	/* HTML 生成 */
	const html = await ejs.renderFile(`${env('ROOT')}/${env('TEMPLATE_DIR')}/${configEntry.template}`, {
		pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
		entryId: entryId,
		structuredData: structuredData,
		jsonLd: Object.fromEntries(jsonLd),

		message: message.value.toString(),

		categoryNames: categoriesDto.map((category) => category.name),
		categoryFileNames: categoriesDto.map((category) => category.file_name).find((fileName) => fileName !== undefined),
		relations: relations,

		entryCountOfCategoryList: entryCountOfCategoryList,
		newlyEntries: newlyEntries,
	});

	/* レンダリング、ファイル出力 */
	return await rendering.generation(html);
});
