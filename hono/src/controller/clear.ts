import dayjs from 'dayjs';
import { Hono } from 'hono';
import type { Variables } from '../app.ts';
import { clear } from '../process/dsg.ts';
import { create as createFeed } from '../process/feed.ts';
import { create as createNewlyJson } from '../process/newlyJson.ts';
import { create as createSitemap } from '../process/sitemap.ts';
import type { Clear as Result, ClearProcess as ProcessResult } from '../../../@types/api.d.ts';

/**
 * DSG キャッシュクリア
 */
export const clearApp = new Hono<{ Variables: Variables }>().post(async (context) => {
	const [clearDSGResult, createFeedResult, createSitemapResult, createNewlyJsonResult] = await Promise.all([
		clear(),
		createFeed(),
		createSitemap(),
		createNewlyJson(),
	]);

	const results: ProcessResult[] = [
		{
			success: clearDSGResult.success,
			message: `${clearDSGResult.message}${clearDSGResult.date !== undefined ? dayjs(clearDSGResult.date).format(' <HH:mm:ss>') : ''}`,
		},
		createFeedResult,
		createSitemapResult,
		createNewlyJsonResult,
	];

	return context.json({
		processes: results,
	} as Result);
});
