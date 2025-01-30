import fs from 'node:fs';
import dayjs from 'dayjs';
import ejs from 'ejs';
import type { Request, Response } from 'express';
import configExpress from '../config/express.js';
import configEntry from '../config/entry.js';
import BlogEntryDao from '../dao/BlogEntryDao.js';
import Markdown from '../markdown/Markdown.js';
import MarkdownTitle from '../markdown/Title.js';
import { env } from '../util/env.js';
import { rendering, generation, checkLastModified, rendering404 } from '../util/response.js';
import Sidebar from '../util/Sidebar.js';

/**
 * 記事
 *
 * @param req - Request
 * @param res - Response
 */
const execute = async (req: Request, res: Response): Promise<void> => {
	const requestQuery: BlogRequest.Entry = {
		entry_id: Number(req.params['entry_id']),
	};

	const dao = new BlogEntryDao(env('SQLITE_BLOG'));

	const lastModified = await dao.getLastModified();

	/* 最終更新日時をセット */
	if (checkLastModified(req, res, lastModified)) {
		return;
	}

	const htmlFilePath = `${env('HTML')}/${configEntry.html.directory}/${String(requestQuery.entry_id)}${configExpress.extension.html}`;
	const htmlBrotliFilePath = `${htmlFilePath}${configExpress.extension.brotli}`;

	if (fs.existsSync(htmlFilePath) && lastModified <= (await fs.promises.stat(htmlFilePath)).mtime) {
		/* 生成された HTML をロードする */
		await rendering(req, res, { htmlPath: htmlFilePath, brotliPath: htmlBrotliFilePath });
		return;
	}

	/* DB からデータ取得 */
	const entryDto = await dao.getEntry(requestQuery.entry_id);
	if (entryDto === null) {
		rendering404(res);
		return;
	}

	const markdown = new Markdown();

	const sidebar = new Sidebar(dao);

	const [message, categoriesDto, relationDataListDto, entryCountOfCategoryList, newlyEntries] = await Promise.all([
		(await markdown.toHtml(entryDto.message)).value.toString(),
		dao.getCategories(requestQuery.entry_id),
		dao.getRelations(requestQuery.entry_id),
		sidebar.getEntryCountOfCategory(),
		sidebar.getNewlyEntries(configExpress.sidebar.newly.maximumNumber),
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
	const html = await ejs.renderFile(`${env('VIEWS')}/${configEntry.template}`, {
		pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
		requestQuery: requestQuery,
		structuredData: structuredData,
		jsonLd: Object.fromEntries(jsonLd),

		message: message,

		categoryNames: categoriesDto.map((category) => category.name),
		categoryFileNames: categoriesDto.map((category) => category.file_name).find((fileName) => fileName !== null),
		relations: relations,

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
