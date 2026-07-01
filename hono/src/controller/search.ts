import { Hono } from 'hono';
import { escape } from '@w0s/html-escape';
import type { Variables } from '../app.ts';
import { type Engine, param as validatorParam } from '../validator/search.ts';

/**
 * 検索
 */

const getURL = (engine: Engine, q: string): string => {
	const SITE = 'blog.w0s.jp';

	switch (engine) {
		case 'google': {
			const urlSearchParams = new URLSearchParams();
			urlSearchParams.append('as_sitesearch', SITE); // https://brightdata.com/blog/web-data/google-search-url-parameters#title-29
			urlSearchParams.append('q', q);

			return `https://www.google.com/search?${urlSearchParams.toString()}`;
		}
		case 'bing': {
			const urlSearchParams = new URLSearchParams();
			urlSearchParams.append('q', `${q} site:${SITE}`); // https://support.microsoft.com/en-us/bing/advanced-search-keywords

			return `https://www.bing.com/search?${urlSearchParams.toString()}`;
		}
		case 'yahoo': {
			const urlSearchParams = new URLSearchParams();
			urlSearchParams.append('p', `${q} site:${SITE}`);

			return `https://search.yahoo.co.jp/search?${urlSearchParams.toString()}`;
		}
		case 'ddg': {
			const urlSearchParams = new URLSearchParams();
			urlSearchParams.append('q', `${q} site:${SITE}`);

			return `https://duckduckgo.com/?${urlSearchParams.toString()}`;
		}
		default:
	}

	throw new Error(); // 到達不能
};

export const searchApp = new Hono<{ Variables: Variables }>().get(validatorParam, (context) => {
	const { req } = context;

	const { engine, q } = req.valid('query');

	const redirectUrl = getURL(engine, q);

	return context.html(
		`<!DOCTYPE html>
	<html lang=ja>
	<meta name=viewport content="width=device-width,initial-scale=1">
	<title>ページ移動</title>
	<p>検索結果は次の URL で取得できます。 <a href="${escape(redirectUrl)}"><code>${escape(redirectUrl)}</code></a>`,
		301,
		{ Location: redirectUrl },
	);
});
