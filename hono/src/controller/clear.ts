import dayjs from 'dayjs';
import { Hono } from 'hono';
import type { Variables } from '../app.ts';
import configProcess from '../config/process.ts';
import { clear } from '../process/dsg.ts';
import { create as createFeed } from '../process/feed.ts';
import { create as createNewlyJson } from '../process/newlyJson.ts';
import { create as createSitemap } from '../process/sitemap.ts';
import type { ClearProcess as ProcessResult, Clear as Result } from '../../../@types/api.d.ts';

/**
 * Deferred Static Generation キャッシュクリア
 */
export const clearApp = new Hono<{ Variables: Variables }>().post(async (context) => {
	const logger = context.get('logger');

	const [clearDSGResult, createFeedResult, createSitemapResult, createNewlyJsonResult] = await Promise.allSettled([
		clear(),
		createFeed(),
		createSitemap(),
		createNewlyJson(),
	]);

	const results: ProcessResult[] = [];

	if (clearDSGResult.status === 'fulfilled') {
		logger.info(`Modified date of DB was recorded: ${clearDSGResult.value.toString()}`);
		results.push({ success: true, message: `${configProcess.dsg.processMessage.success} <${dayjs(clearDSGResult.value).format('HH:mm:ss')}>` });
	} else {
		logger.error(clearDSGResult.reason);
		results.push({ success: false, message: `${configProcess.dsg.processMessage.failure}: ${String(clearDSGResult.reason)}` });
	}

	if (createFeedResult.status === 'fulfilled') {
		logger.info(createFeedResult.value, `Feed file created:`);
		results.push({ success: true, message: `${configProcess.feed.processMessage.success}（${String(createFeedResult.value.length)}ファイル）` });
	} else {
		logger.error(createFeedResult.reason);
		results.push({ success: false, message: `${configProcess.feed.processMessage.failure}: ${String(createFeedResult.reason)}` });
	}

	if (createSitemapResult.status === 'fulfilled') {
		logger.info(createSitemapResult.value, `Sitemap file created:`);
		results.push({ success: true, message: `${configProcess.sitemap.processMessage.success}（${String(createSitemapResult.value.length)}ファイル）` });
	} else {
		logger.error(createSitemapResult.reason);
		results.push({ success: false, message: `${configProcess.sitemap.processMessage.failure}: ${String(createSitemapResult.reason)}` });
	}

	if (createNewlyJsonResult.status === 'fulfilled') {
		logger.info(createNewlyJsonResult.value, `JSON file created:`);
		results.push({ success: true, message: `${configProcess.newlyJson.processMessage.success}（${String(createNewlyJsonResult.value.length)}ファイル）` });
	} else {
		logger.error(createNewlyJsonResult.reason);
		results.push({ success: false, message: `${configProcess.newlyJson.processMessage.failure}: ${String(createNewlyJsonResult.reason)}` });
	}

	return context.json({
		processes: results,
	} as Result);
});
