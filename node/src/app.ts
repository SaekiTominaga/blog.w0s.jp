import AmazonController from './controller/api/AmazonController.js';
import CategoryController from './controller/CategoryController.js';
import compression from 'compression';
import cors from 'cors';
import Express, { NextFunction, Request, Response } from 'express';
import FeedCreateController from './controller/api/FeedCreateController.js';
import fs from 'fs';
import ListController from './controller/ListController.js';
import Log4js from 'log4js';
import MessagePreviewController from './controller/MessagePreviewController.js';
import path from 'path';
import TopicController from './controller/TopicController.js';
import TweetController from './controller/api/TweetController.js';
import { NoName as Configure } from '../configure/type/common.js';
import { TypeMap } from 'mime';

/* 設定ファイル読み込み */
const config = <Configure>JSON.parse(fs.readFileSync('node/configure/common.json', 'utf8'));

/* Logger 設定 */
Log4js.configure(config.logger.path);
const logger = Log4js.getLogger();

/* Express 設定 */
Express.static.mime.define(<TypeMap>config.static.headers.mime.extension); // 静的ファイルの MIME

const app = Express();

app.set('x-powered-by', false);
app.set('trust proxy', true);
app.set('views', config.views);
app.set('view engine', 'ejs');
app.use((req, res, next) => {
	const requestUrl = req.url;

	let requestFilePath: string | undefined; // 実ファイルパス
	if (requestUrl.endsWith('/')) {
		/* ディレクトリトップ（e.g. /foo/ ） */
		const fileName = config.static.indexes?.find((name) => fs.existsSync(`${config.static.root}/${requestUrl}${name}`));
		if (fileName !== undefined) {
			requestFilePath = `${requestUrl}${fileName}`;
		}
	} else if (path.extname(requestUrl) === '') {
		/* 拡張子のない URL（e.g. /foo ） */
		const extension = config.static.extensions?.find((ext) => fs.existsSync(`${config.static.root}/${requestUrl}.${ext}`));
		if (extension !== undefined) {
			requestFilePath = `${requestUrl}.${extension}`;
		}
	} else {
		/* 拡張子のある URL（e.g. /foo.txt ） */
		requestFilePath = requestUrl;
	}

	const mimeOfPath = Object.entries(<{ [key: string]: string[] }>config.static.headers.mime.path).find(
		([, paths]) => requestFilePath !== undefined && paths.includes(requestFilePath)
	)?.[0]; // ファイルパスから決定される MIME
	const mimeOfExtension = Object.entries(<TypeMap>config.static.headers.mime.extension).find(
		([, extensions]) => requestFilePath !== undefined && extensions.includes(path.extname(requestFilePath).substring(1))
	)?.[0]; // 拡張子から決定される MIME
	const mime = mimeOfPath ?? mimeOfExtension;

	/* 特殊なファイルパスの MIME */
	if (mimeOfPath !== undefined) {
		logger.debug('Content-Type', `${requestUrl} - ${mimeOfPath}`);

		res.setHeader('Content-Type', mimeOfPath);
	}

	/* HSTS */
	res.setHeader('Strict-Transport-Security', config.response.header.hsts);

	/* CSP */
	if (requestFilePath === undefined || (!/^\/api\//.test(requestUrl) && ['.html', '.xhtml'].some((ext) => requestFilePath?.endsWith(ext)))) {
		res.setHeader('Content-Security-Policy', config.response.header.csp_html);
		res.setHeader('Content-Security-Policy-Report-Only', config.response.header.cspro_html);
	} else {
		res.setHeader('Content-Security-Policy', config.response.header.csp);
	}

	/* MIME スニッフィング抑止 */
	res.setHeader('X-Content-Type-Options', 'nosniff');

	// if (req.method === 'GET' && req.acceptsEncodings('br') === 'br') {
	// 	/* Brotli の拡張子 */
	// 	const BROTLI_EXTENTION = '.br';

	// 	if (css) {
	// 		req.url = `${requestUrl}${BROTLI_EXTENTION}`;
	// 		res.setHeader('Content-Type', 'text/css; charset=UTF-8');
	// 		res.setHeader('Content-Encoding', 'br');
	// 	} else if (js) {
	// 		req.url = `${requestUrl}${BROTLI_EXTENTION}`;
	// 		res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
	// 		res.setHeader('Content-Encoding', 'br');
	// 	} else if (svg) {
	// 		const brotliFilePath = `${requestUrl}${BROTLI_EXTENTION}`;
	// 		if (fs.existsSync(`${config.static.root}/${brotliFilePath}`)) {
	// 			req.url = brotliFilePath;
	// 			res.setHeader('Content-Type', 'image/svg+xml; charset=UTF-8');
	// 			res.setHeader('Content-Encoding', 'br');
	// 		}
	// 	} else if (feed) {
	// 		req.url = `${requestUrl}.atom${BROTLI_EXTENTION}`;
	// 		res.setHeader('Content-Type', 'application/atom+xml; charset=UTF-8');
	// 		res.setHeader('Content-Encoding', 'br');
	// 	}
	// }
	/* Brotli */
	if (requestFilePath !== undefined && req.method === 'GET' && req.acceptsEncodings('br') === 'br') {
		const BROTLI_EXTENTION = '.br'; // Brotli ファイルの拡張子

		const brotliFilePath = `${requestFilePath}${BROTLI_EXTENTION}`;
		if (fs.existsSync(`${config.static.root}/${brotliFilePath}`)) {
			if (mime === undefined) {
				logger.error('MIME が未定義のファイル', requestFilePath);
			} else {
				logger.debug('Brotli', requestFilePath);

				req.url = `${requestFilePath}${BROTLI_EXTENTION}`;
				res.setHeader('Content-Type', mime);
				res.setHeader('Content-Encoding', 'br');
			}
		}
	}

	next();
});
app.use(
	compression({
		threshold: config.response.compression.threshold,
	})
);
app.use(Express.urlencoded({ limit: 1000000 })); // 1MB
app.use(
	Express.static(config.static.root, {
		extensions: config.static.extensions,
		index: config.static.indexes,
		setHeaders: (res, localPath) => {
			const BROTLI_EXTENTION = '.br'; // Brotli ファイルの拡張子

			const req = <Request>res.req; // TODO:
			const requestUrl = req.url;
			const requestUrlOrigin = requestUrl.endsWith(BROTLI_EXTENTION) ? requestUrl.substring(0, requestUrl.length - BROTLI_EXTENTION.length) : requestUrl;
			const localPathOrigin = localPath.endsWith(BROTLI_EXTENTION) ? localPath.substring(0, localPath.length - BROTLI_EXTENTION.length) : localPath; // 元ファイル（圧縮ファイルではない）の絶対パス
			const extensionOrigin = path.extname(localPathOrigin); // 元ファイルの拡張子

			logger.debug('requestUrlOrigin', requestUrlOrigin);
			logger.debug('localPathOrigin', localPathOrigin);

			/* Cache */
			if (config.static.headers.cache_control !== undefined) {
				const cacheControlValue =
					config.static.headers.cache_control.path.find((path) => path.paths.includes(requestUrlOrigin))?.value ??
					config.static.headers.cache_control.extension.find((ext) => ext.extensions.includes(extensionOrigin))?.value ??
					config.static.headers.cache_control.default;

				logger.debug('Cache-Control', `${requestUrlOrigin} - ${cacheControlValue}`);

				res.setHeader('Cache-Control', cacheControlValue);
			}

			/* SourceMap */
			if (config.static.headers.source_map?.extensions?.includes(extensionOrigin)) {
				const MAP_EXTENTION = '.map'; // ソースマップファイルの拡張子

				const mapFilePath = `${localPathOrigin}${MAP_EXTENTION}`;
				if (fs.existsSync(mapFilePath)) {
					const mapFileUrl = path.basename(mapFilePath);

					logger.debug('SourceMap', mapFileUrl);

					res.setHeader('SourceMap', mapFileUrl);
				}
			}
		},
	})
);

/**
 * 記事リスト
 */
app.get(['/', '/list/:page([1-9][0-9]{0,1})'], async (req, res, next) => {
	try {
		await new ListController(config).execute(req, res);
	} catch (e) {
		next(e);
	}
});

/**
 * 記事
 */
app.get('/:topic_id([1-9][0-9]{0,2})', async (req, res, next) => {
	try {
		await new TopicController(config).execute(req, res);
	} catch (e) {
		next(e);
	}
});

/**
 * カテゴリ
 */
app.get('/category/:category_name', async (req, res, next) => {
	try {
		await new CategoryController(config).execute(req, res);
	} catch (e) {
		next(e);
	}
});

/**
 * 本文プレビュー
 */
app.post('/message-preview', async (req, res, next) => {
	try {
		await new MessagePreviewController(config).execute(req, res);
	} catch (e) {
		next(e);
	}
});

/**
 * API
 */
const corsPreflightedRequestCallback = cors({
	origin: config.cors.allow_origins,
	methods: ['POST'],
});
const corsCallback = cors({
	origin: config.cors.allow_origins,
});

/**
 * API・フィード作成
 */
app.put('/feed.atom', async (req, res, next) => {
	try {
		await new FeedCreateController(config).execute(req, res);
	} catch (e) {
		next(e);
	}
});

/**
 * API・Amazon 商品情報取得
 */
app.options('/api/amazon', corsPreflightedRequestCallback);
app.post('/api/amazon', corsCallback, async (req, res, next) => {
	try {
		await new AmazonController(config).execute(req, res);
	} catch (e) {
		next(e);
	}
});

/**
 * API・ツイート情報取得
 */
app.options('/api/tweet', corsPreflightedRequestCallback);
app.post('/api/tweet', corsCallback, async (req, res, next) => {
	try {
		await new TweetController(config).execute(req, res);
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
