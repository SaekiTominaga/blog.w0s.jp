import CategoryController from './controller/CategoryController.js';
import compression from 'compression';
import Express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import HttpResponse from './util/HttpResponse.js';
import ListController from './controller/ListController.js';
import Log4js from 'log4js';
import path from 'path';
import TopicController from './controller/TopicController.js';
import { NoName as Configure } from '../configure/type/Common.js';
import { TypeMap } from 'mime';

/* 設定ファイル読み込み */
const config = <Configure>JSON.parse(fs.readFileSync('node/configure/Common.json', 'utf8'));

/* Logger 設定 */
Log4js.configure(config.logger.path);
const logger = Log4js.getLogger();

/* Express 設定 */
Express.static.mime.define(<TypeMap>config.response.mime); // 静的ファイルの MIME

const app = Express();

app.set('x-powered-by', false);
app.set('trust proxy', true);
app.set('views', config.views);
app.set('view engine', 'ejs');
app.use((req, res, next) => {
	const requestUrl = req.url;

	const feed = ['/feed'].includes(requestUrl);
	const html = !feed && /(^\/[^.]*$)|(\.x?html$)/.test(requestUrl);
	const css = /^\/style\/.+\.css$/.test(requestUrl);
	const js = /^\/script\/.+\.m?js$/.test(requestUrl);
	const svg = requestUrl.endsWith('.svg');

	/* HSTS */
	res.setHeader('Strict-Transport-Security', config.response.header.hsts);

	/* CSP */
	if (html) {
		res.setHeader('Content-Security-Policy', config.response.header.csp_html);
		res.setHeader('Content-Security-Policy-Report-Only', config.response.header.cspro_html);
	} else {
		res.setHeader('Content-Security-Policy', config.response.header.csp);
	}

	/* ソースマップ */
	if (css || js) {
		res.setHeader('SourceMap', `${path.basename(requestUrl)}.map`);
	}

	/* Brotli */
	if (req.acceptsEncodings('br') === 'br') {
		if (css) {
			req.url = `${requestUrl}.br`;
			res.setHeader('Content-Type', 'text/css; charset=UTF-8');
			res.setHeader('Content-Encoding', 'br');
		} else if (js) {
			req.url = `${requestUrl}.br`;
			res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
			res.setHeader('Content-Encoding', 'br');
		} else if (svg) {
			const brotliFilePath = `${requestUrl}.br`;
			if (fs.existsSync(`${config.static.root}/${brotliFilePath}`)) {
				req.url = brotliFilePath;
				res.setHeader('Content-Type', 'image/svg+xml; charset=UTF-8');
				res.setHeader('Content-Encoding', 'br');
			}
		}
	}

	/* MIME スニッフィング抑止 */
	res.setHeader('X-Content-Type-Options', 'nosniff');

	next();
});
app.use(
	compression({
		threshold: config.response.compression.threshold,
	})
);
app.use(
	Express.static(config.static.root, {
		extensions: config.static.options.extensions,
		index: config.static.options.index,
		maxAge: config.static.options.max_age,
	})
);

/**
 * 記事リスト
 */
app.get(['/', '/list/:page([1-9][0-9]{0,1})'], async (req, res, next) => {
	try {
		await new ListController().execute(req, new HttpResponse(res, config));
	} catch (e) {
		next(e);
	}
});

/**
 * 記事
 */
app.get('/:topic_id([1-9][0-9]{0,2})', async (req, res, next) => {
	try {
		await new TopicController().execute(req, new HttpResponse(res, config));
	} catch (e) {
		next(e);
	}
});

/**
 * カテゴリ
 */
app.get('/category/:category_name', async (req, res, next) => {
	try {
		await new CategoryController().execute(req, new HttpResponse(res, config));
	} catch (e) {
		next(e);
	}
});

/**
 * エラー処理
 */
app.use((req, res): void => {
	logger.warn(`404 Not Found: ${req.method} ${req.url}`);
	res.status(404).sendFile(path.resolve(config.errorpage.path_404));
});
app.use((err: Error, req: Request, res: Response, _next: NextFunction /* eslint-disable-line @typescript-eslint/no-unused-vars */): void => {
	logger.fatal(`${req.method} ${req.url}`, err.stack);
	res.status(500).send(`<!DOCTYPE html>
<html lang=ja>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>富永日記帳</title>
<h1>500 Internal Server Error</h1>`);
});

/**
 * HTTP サーバー起動
 */
app.listen(config.port, () => {
	logger.info(`Example app listening at http://localhost:${config.port}`);
});
