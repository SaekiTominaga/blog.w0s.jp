import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import express, { type NextFunction, type Request, type Response } from 'express';
import Log4js from 'log4js';
import { isMatch } from 'matcher';
import multer from 'multer';
import type { NoName as Configure } from '../../configure/type/common.js';
import CategoryController from './controller/CategoryController.js';
import EntryController from './controller/EntryController.js';
import HttpBasicAuth from './util/HttpBasicAuth.js';
import HttpResponse from './util/HttpResponse.js';
import ListController from './controller/ListController.js';
import PostController from './controller/PostController.js';
import PreviewController from './controller/api/PreviewController.js';

/* 設定ファイル読み込み */
const config = JSON.parse((await fs.promises.readFile('configure/common.json')).toString()) as Configure;

/* Logger 設定 */
Log4js.configure(config.logger.path);
const logger = Log4js.getLogger();

const app = express();
const env = app.get('env') as Express.Env;

app.set('trust proxy', true);
app.set('views', config.views);
app.set('view engine', 'ejs');
app.set('x-powered-by', false);

app.use(
	(_req, res, next) => {
		/* HSTS */
		res.setHeader('Strict-Transport-Security', config.response.header.hsts);

		/* CSP */
		res.setHeader('Content-Security-Policy', config.response.header.csp);

		/* Report */
		res.setHeader(
			'Reporting-Endpoints',
			Object.entries(config.response.header.reporting_endpoints)
				.map((endpoint) => `${endpoint.at(0) ?? ''}="${endpoint.at(1) ?? ''}"`)
				.join(','),
		);

		/* MIME スニッフィング抑止 */
		res.setHeader('X-Content-Type-Options', 'nosniff');

		next();
	},
	compression({
		threshold: config.response.compression.threshold,
	}),
	express.urlencoded({
		extended: true,
		limit: config.request.urlencoded.limit,
	}),
	async (req, res, next) => {
		/* Basic Authentication */
		const basic = config.static.auth_basic?.find((auth) => isMatch(req.url, auth.urls));
		if (basic !== undefined) {
			const httpBasicAuth = new HttpBasicAuth(req);
			if (!(await httpBasicAuth.htpasswd(basic.htpasswd))) {
				new HttpResponse(req, res, config).send401('Basic', basic.realm);
				return;
			}
		}

		next();
	},
	(req, res, next) => {
		const requestPath = req.path;

		let requestFilePath: string | undefined; // 実ファイルパス
		if (requestPath.endsWith('/')) {
			/* ディレクトリトップ（e.g. /foo/ ） */
			const fileName = config.static.indexes?.find((name) => fs.existsSync(`${config.static.root}${requestPath}${name}`));
			if (fileName !== undefined) {
				requestFilePath = `${requestPath}${fileName}`;
			}
		} else if (path.extname(requestPath) === '') {
			/* 拡張子のない URL（e.g. /foo ） */
			const extension = config.static.extensions?.find((ext) => fs.existsSync(`${config.static.root}${requestPath}${ext}`));
			if (extension !== undefined) {
				requestFilePath = `${requestPath}${extension}`;
			}
		} else if (fs.existsSync(`${config.static.root}${requestPath}`)) {
			/* 拡張子のある URL（e.g. /foo.txt ） */
			requestFilePath = requestPath;
		}

		/* Brotli */
		if (requestFilePath !== undefined && req.method === 'GET' && req.acceptsEncodings('br') === 'br') {
			const brotliFilePath = `${requestFilePath}${config.extension.brotli}`;
			if (fs.existsSync(`${config.static.root}${brotliFilePath}`)) {
				req.url = brotliFilePath;
				res.setHeader('Content-Encoding', 'br');
			}
		}

		next();
	},
	express.static(config.static.root, {
		extensions: config.static.extensions?.map((ext) => /* 拡張子の . は不要 */ ext.substring(1)),
		index: config.static.indexes,
		setHeaders: (res, localPath) => {
			const requestUrl = res.req.url; // リクエストパス e.g. ('/foo.html.br')
			const requestUrlOrigin = requestUrl.endsWith(config.extension.brotli)
				? requestUrl.substring(0, requestUrl.length - config.extension.brotli.length)
				: requestUrl; // 元ファイル（圧縮ファイルではない）のリクエストパス (e.g. '/foo.html')
			const localPathOrigin = localPath.endsWith(config.extension.brotli)
				? localPath.substring(0, localPath.length - config.extension.brotli.length)
				: localPath; // 元ファイルの絶対パス (e.g. '/var/www/public/foo.html')
			const extensionOrigin = path.extname(localPathOrigin); // 元ファイルの拡張子 (e.g. '.html')

			/* Content-Type */
			const mimeType =
				Object.entries(config.static.headers.mime_type.path)
					.find(([filePath]) => filePath === requestUrlOrigin)
					?.at(1) ??
				Object.entries(config.static.headers.mime_type.extension)
					.find(([fileExtension]) => fileExtension === extensionOrigin)
					?.at(1);
			if (mimeType === undefined) {
				logger.error(`MIME type is undefined: ${requestUrlOrigin}`);
			}
			res.setHeader('Content-Type', mimeType ?? 'application/octet-stream');

			/* Cache-Control */
			if (config.static.headers.cache_control !== undefined) {
				const cacheControlConfig = env === 'production' ? config.static.headers.cache_control.production : config.static.headers.cache_control.development;

				const cacheControl =
					cacheControlConfig.path?.find((ccPath) => ccPath.paths.includes(requestUrlOrigin))?.value ??
					cacheControlConfig.extension?.find((ccExt) => ccExt.extensions.includes(extensionOrigin))?.value ??
					cacheControlConfig.default;

				res.setHeader('Cache-Control', cacheControl);
			}

			/* CORS */
			if (config.static.headers.cors?.directory.find((urlPath) => requestUrl.startsWith(urlPath)) !== undefined) {
				const origin = res.req.get('Origin');
				if (origin !== undefined && config.static.headers.cors.origin.includes(origin)) {
					res.setHeader('Access-Control-Allow-Origin', origin);
					res.vary('Origin');
				}
			}

			/* SourceMap */
			if (config.static.headers.source_map?.extensions?.includes(extensionOrigin)) {
				const mapFilePath = `${localPathOrigin}${config.extension.map}`;
				if (fs.existsSync(mapFilePath)) {
					res.setHeader('SourceMap', path.basename(mapFilePath));
				}
			}

			/* CSP */
			if (['.html', '.xhtml'].includes(extensionOrigin)) {
				res.setHeader('Content-Security-Policy', config.response.header.csp_html);
				res.setHeader('Content-Security-Policy-Report-Only', config.response.header.cspro_html);
			}
		},
	}),
);

const upload = multer({ dest: config.temp });

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
app.get('/:entry_id([1-9][0-9]{0,2})', async (req, res, next) => {
	try {
		await new EntryController(config).execute(req, res);
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
 * 記事投稿
 */
app
	.route('/admin/post')
	.get(async (req, res, next) => {
		try {
			await new PostController(config, env).execute(req, res);
		} catch (e) {
			next(e);
		}
	})
	.post(upload.array('media'), async (req, res, next) => {
		try {
			await new PostController(config, env).execute(req, res);
		} catch (e) {
			next(e);
		}
	});

/**
 * 本文プレビュー
 */
app.post('/api/preview', async (req, res, next) => {
	try {
		await new PreviewController(config).execute(req, res);
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
	logger.info(`Example app listening at http://localhost:${String(config.port)}`);
});
