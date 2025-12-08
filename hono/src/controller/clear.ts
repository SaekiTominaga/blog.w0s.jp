import dayjs from 'dayjs';
import { Hono } from 'hono';
import clear from '../process/dsg.ts';
import createFeed from '../process/feed.ts';
import createNewlyJson from '../process/newlyJson.ts';
import createSitemap from '../process/sitemap.ts';
import type { Clear } from '../../../@types/api.d.ts';

/**
 * DSG キャッシュクリア
 */
export const clearApp = new Hono().post(async (context) => {
	const [clearDSGResult, createFeedResult, createSitemapResult, createNewlyJsonResult] = await Promise.all([
		clear(),
		createFeed(),
		createSitemap(),
		createNewlyJson(),
	]);

	const responseJson: Clear = [
		{
			success: clearDSGResult.success,
			message: `${clearDSGResult.message}${clearDSGResult.date !== undefined ? dayjs(clearDSGResult.date).format(' <HH:mm:ss>') : ''}`,
		},
		createFeedResult,
		createSitemapResult,
		createNewlyJsonResult,
	];

	return context.json(responseJson);
});
