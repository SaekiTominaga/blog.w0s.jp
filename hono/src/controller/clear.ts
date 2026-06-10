import { inspect } from 'node:util';
import dayjs from 'dayjs';
import { Hono } from 'hono';
import type { Variables } from '../app.ts';
import configProcess from '../config/process.ts';
import { clear } from '../process/dsg.ts';
import { create as createFeed } from '../process/feed.ts';
import { create as createNewlyJson } from '../process/newlyJson.ts';
import { create as createSitemap } from '../process/sitemap.ts';
import { form as validatorForm } from '../validator/clear.ts';
import type { Post as ApiResponse } from '../../../@types/api.d.ts';

/**
 * キャッシュクリア
 */
export const clearApp = new Hono<{ Variables: Variables }>().post(validatorForm, async (context) => {
	const { req } = context;
	const logger = context.get('logger');

	const { response } = req.valid('form');

	const [clearResult, createFeedResult, createSitemapResult, createNewlyJsonResult] = await Promise.allSettled([
		clear(),
		createFeed(),
		createSitemap(),
		createNewlyJson(),
	]);

	const results: ApiResponse = [];

	if (clearResult.status === 'fulfilled') {
		logger.info(`Modified date of DB was recorded: ${clearResult.value.toString()}`);
		results.push({ success: true, message: `${configProcess.dsg.processMessage.success} <${dayjs(clearResult.value).format('HH:mm:ss')}>` });
	} else {
		logger.error(clearResult.reason);
		results.push({ success: false, message: `${configProcess.dsg.processMessage.failure}: ${String(clearResult.reason)}` });
	}

	if (createFeedResult.status === 'fulfilled') {
		logger.info(`Feed file created: ${inspect(createFeedResult.value)}`);
		results.push({ success: true, message: `${configProcess.feed.processMessage.success}（${String(createFeedResult.value.length)}ファイル）` });
	} else {
		logger.error(createFeedResult.reason);
		results.push({ success: false, message: `${configProcess.feed.processMessage.failure}: ${String(createFeedResult.reason)}` });
	}

	if (createSitemapResult.status === 'fulfilled') {
		logger.info(`Sitemap file created: ${inspect(createSitemapResult.value)}`);
		results.push({ success: true, message: `${configProcess.sitemap.processMessage.success}（${String(createSitemapResult.value.length)}ファイル）` });
	} else {
		logger.error(createSitemapResult.reason);
		results.push({ success: false, message: `${configProcess.sitemap.processMessage.failure}: ${String(createSitemapResult.reason)}` });
	}

	if (createNewlyJsonResult.status === 'fulfilled') {
		logger.info(`JSON file created: ${inspect(createNewlyJsonResult.value)}`);
		results.push({ success: true, message: `${configProcess.newlyJson.processMessage.success}（${String(createNewlyJsonResult.value.length)}ファイル）` });
	} else {
		logger.error(createNewlyJsonResult.reason);
		results.push({ success: false, message: `${configProcess.newlyJson.processMessage.failure}: ${String(createNewlyJsonResult.reason)}` });
	}

	if (response === 'text') {
		return context.text(results.map((result) => `${result.success ? '✅' : '❌'} ${result.message}`).join('\n'));
	}

	return context.json(results as ApiResponse);
});
