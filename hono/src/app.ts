import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { compress } from 'hono/compress';
import { HTTPException } from 'hono/http-exception';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import Log4js from 'log4js';
import { escape } from '@w0s/html-escape';
import config from './config/hono.js';
import { categoryApp } from './controller/category.js';
import { entryApp } from './controller/entry.js';
import { topApp, listApp } from './controller/list.js';
import { adminApp } from './controller/admin.js';
import { previewApp } from './controller/preview.js';
import { getAuth } from './util/auth.js';
import { env } from './util/env.js';
import { csp as cspHeader, reportingEndpoints as reportingEndpointsHeader } from './util/httpHeader.js';

loadEnvFile(process.env['NODE_ENV'] === 'production' ? '../.env.production' : '../.env.development');

/* Logger 設定 */
Log4js.configure(env('LOGGER'));
const logger = Log4js.getLogger();

/* Hono */
const app = new Hono();

app.use(
	compress({
		threshold: config.response.compression.threshold,
	}),
);

app.use(async (context, next) => {
	/* HSTS */
	context.header('Strict-Transport-Security', config.response.header.hsts);

	/* CSP */
	context.header('Content-Security-Policy', cspHeader(config.response.header.csp));

	/* Report */
	context.header('Reporting-Endpoints', reportingEndpointsHeader(config.response.header.reportingEndpoints));

	/* MIME スニッフィング抑止 */
	context.header('X-Content-Type-Options', 'nosniff');

	await next();
});

/* Redirect */
config.redirect.forEach((redirect) => {
	if (!redirect.to.startsWith('/')) {
		throw new Error('The path to the redirect must begin with a U+002F slash');
	}

	app.get(redirect.from, (context) => {
		const { req } = context;

		let redirectPath = redirect.to;
		Object.entries(req.param()).forEach(([, paramValue], index) => {
			if (typeof paramValue !== 'string') {
				throw new Error('Parameter value is not of type `string`');
			}
			redirectPath = redirectPath.replace(`$${String(index + 1)}`, paramValue);
		});

		logger.debug(`redirect: ${req.url} → ${redirectPath}`);

		return context.html(
			`<!DOCTYPE html>
<html lang=ja>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>ページ移動</title>
<p>このページは <a href="${escape(redirectPath)}"><code>${escape(redirectPath)}</code></a> に移動しました。`,
			301,
			{ Location: redirectPath },
		);
	});
});

/* Favicon */
app.get('/favicon.ico', async (context, next) => {
	const { res } = context;

	const file = await fs.promises.readFile(`${config.static.root}/favicon.ico`);

	res.headers.set('Content-Type', 'image/svg+xml;charset=utf-8');
	context.body(file);

	await next();
});

/* Static files */
app.use(
	serveStatic({
		root: config.static.root,
		index: config.static.index,
		precompressed: true,
		rewriteRequestPath: (urlPath) => {
			if (!urlPath.endsWith('/') && !urlPath.includes('.')) {
				/* 拡張子のない URL（e.g. /foo ） */
				const extension = config.static.extensions.find((ext) => fs.existsSync(`${config.static.root}${urlPath}${ext}`));
				if (extension !== undefined) {
					return `${urlPath}${extension}`;
				}
			}

			return urlPath;
		},
		onFound: (localPath, context) => {
			const { req, res } = context;

			const urlPath = path.normalize(localPath).substring(path.normalize(config.static.root).length).replaceAll(path.sep, '/'); // URL のパス部分 e.g. ('/foo.html')
			const urlExtension = path.extname(urlPath); // URL の拡張子部分 (e.g. '.html')

			/* Content-Type; hono 公式に登録されていない MIME タイプを設定 */
			const addedContentType = Object.entries(config.static.headers.contentType).find(([ext]) => ext === urlExtension);
			if (addedContentType !== undefined) {
				const [, contentType] = addedContentType;
				res.headers.set('Content-Type', contentType);
			}

			/* Cache-Control */
			const cacheControl =
				process.env['NODE_ENV'] === 'production'
					? (config.static.headers.cacheControl.path.find((ccPath) => ccPath.paths.includes(urlPath))?.value ??
						config.static.headers.cacheControl.extension.find((ccExt) => ccExt.extensions.includes(urlExtension))?.value ??
						config.static.headers.cacheControl.default)
					: 'no-cache';
			res.headers.set('Cache-Control', cacheControl);

			/* SourceMap */
			if (config.static.headers.sourceMap.includes(urlExtension)) {
				const mapPath = `${urlPath}${config.extension.map}`;

				res.headers.set('SourceMap', path.basename(mapPath));
			}

			/* CORS */
			if (urlPath.startsWith('/json/')) {
				const requestOrigin = req.header('Origin');
				if (requestOrigin !== undefined) {
					const allowOrigins = env('JSON_CORS_ORIGINS', 'string[]');
					if (allowOrigins.includes(requestOrigin)) {
						res.headers.set('Access-Control-Allow-Origin', requestOrigin);
					}
				}
				res.headers.append('Vary', 'Origin');
			}

			/* TODO: HTML ファイルの CSP */
		},
	}),
);

/* Auth */
const auth = await getAuth();
app.use(
	`/admin/*`,
	basicAuth({
		verifyUser: (username, password) => {
			const passwordHash = crypto.hash('sha256', password);
			return username === auth.user && passwordHash === auth.password;
		},
		realm: auth.realm,
		invalidUserMessage: config.basicAuth.unauthorizedMessage,
	}),
);

/* Routes */
app.route('/', topApp);
app.route('/list/', listApp);
app.route('/entry/', entryApp);
app.route('/category/', categoryApp);
app.route('/admin/', adminApp);
app.route('/api/preview', previewApp);

/* Error pages */
app.notFound(async (context) => {
	logger.warn(`404 Not Found: ${context.req.method} ${context.req.url}`);

	const html = (await fs.promises.readFile(`${env('VIEWS')}/${config.errorpage.notfound}`)).toString();
	return context.html(html, 404);
});
app.onError(async (err, context) => {
	let htmlFilePath = config.errorpage.serverError;
	const headers = new Headers();
	if (err instanceof HTTPException) {
		if (err.status >= 400 && err.status < 500) {
			switch (err.status) {
				case 401: {
					htmlFilePath = config.errorpage.unauthorized;

					/* 手動で `WWW-Authenticate` ヘッダーを設定 https://github.com/honojs/hono/issues/952 */
					const wwwAuthenticate = err.res?.headers.get('WWW-Authenticate');
					if (wwwAuthenticate !== null && wwwAuthenticate !== undefined) {
						headers.set('WWW-Authenticate', wwwAuthenticate);
					}
					break;
				}
				case 404: {
					htmlFilePath = config.errorpage.notfound;
					logger.info(err.message);
					break;
				}
				default: {
					htmlFilePath = config.errorpage.clientError;
					logger.info(err.status, err.message);
				}
			}
		} else {
			logger.error(err.message);
		}
	} else {
		logger.fatal(err.message);
	}

	const html = (await fs.promises.readFile(`${env('VIEWS')}/${htmlFilePath}`)).toString();
	const status = err instanceof HTTPException ? err.status : 500;

	return context.html(html, status, Object.fromEntries(headers.entries()));
});

if (process.env['TEST'] !== 'test') {
	const port = env('PORT', 'number');
	logger.info(`Server is running on http://localhost:${String(port)}`);

	serve({
		fetch: app.fetch,
		port: port,
	});
}

export default app;
