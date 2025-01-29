import fs from 'node:fs';
import path from 'node:path';
import StringEscapeHtml from '@w0s/html-escape';
import type { Request, Response } from 'express';
import config from '../config/express.js';

type HttpAuthType = 'Basic' | 'Bearer' | 'Digest' | 'HOBA' | 'Mutual' | 'Negotiate' | 'OAuth' | 'SCRAM-SHA-1' | 'SCRAM-SHA-256' | 'vapid';

/**
 * HttpResponse
 */
export default class HttpResponse {
	readonly #req: Request;

	readonly #res: Response;

	readonly #MIME_TYPE_HTML = 'text/html; charset=utf-8';

	/**
	 * @param req - Request
	 * @param res - Request
	 */
	constructor(req: Request, res: Response) {
		this.#req = req;
		this.#res = res;
	}

	/**
	 * 最終更新日時を確認する（ドキュメントに変更がなければ 304 を返して終了、変更があれば Last-Modified ヘッダをセットする）
	 *
	 * @param lastModified - 今回のアクセスに対して発行する最終更新日時
	 *
	 * @returns ドキュメントに変更がなければ true
	 */
	checkLastModified(lastModified: Date): boolean {
		const ifModifiedSince = this.#req.get('If-Modified-Since');
		if (ifModifiedSince !== undefined && lastModified <= new Date(ifModifiedSince)) {
			this.#res.status(304).end();
			return true;
		}

		this.#res.set('Last-Modified', lastModified.toUTCString());
		return false;
	}

	/**
	 * 200 OK
	 *
	 * @param data - 圧縮レスポンスボディ
	 * @param data.body - レスポンスボディ
	 * @param data.brotliBody - レスポンスボディ（Brotli 圧縮）
	 * @param data.filePath - ファイルパス
	 * @param data.brotliFilePath - Brotli ファイルパス
	 * @param data.cacheControl - Cache-Control ヘッダーフィールド値
	 */
	async send200(data: {
		body?: string | Buffer;
		brotliBody?: string | Buffer;
		filePath?: string;
		brotliFilePath?: string;
		cacheControl?: string;
	}): Promise<void> {
		this.#res
			.set('Content-Type', this.#MIME_TYPE_HTML)
			.set('Cache-Control', data.cacheControl ?? 'no-cache')
			.set('Content-Security-Policy', config.response.header.csp_html)
			.set('Content-Security-Policy-Report-Only', config.response.header.cspro_html);

		/* Brotli 圧縮 */
		if (this.#req.acceptsEncodings('br') === 'br') {
			let responseBody = data.brotliBody;
			if (responseBody === undefined && data.brotliFilePath !== undefined) {
				responseBody = await fs.promises.readFile(data.brotliFilePath);
			}

			if (responseBody !== undefined) {
				this.#res.set('Content-Encoding', 'br').send(responseBody);
				return;
			}
		}

		/* 無圧縮 */
		let responseBody = data.body;
		if (responseBody === undefined && data.filePath !== undefined) {
			responseBody = await fs.promises.readFile(data.filePath);
		}

		if (responseBody !== undefined) {
			this.#res.send(responseBody);
			return;
		}

		throw new Error('Neither the response data body nor the file path is specified.');
	}

	/**
	 * 204 No Content
	 */
	send204(): void {
		this.#res.status(204).end();
	}

	/**
	 * 301 Moved Permanently
	 *
	 * @param locationUrl - 遷移先 URL
	 */
	send301(locationUrl: string): void {
		this.#res.status(301).set('Content-Type', this.#MIME_TYPE_HTML).location(locationUrl).send(StringEscapeHtml.template`<!DOCTYPE html>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>Moved Permanently</title>
<h1>301 Moved Permanently</h1>
<p><a href="${locationUrl}">${locationUrl}</a>`);
	}

	/**
	 * 303 See Other
	 *
	 * @param url - 遷移先 URL
	 */
	send303(url?: string): void {
		if (url === undefined && this.#req.method === 'GET') {
			/* 無限ループ回避 */
			throw new Error(`The request URL and 303 redirect destination are the same (${this.#req.path}), risking an infinite loop.`);
		}

		const locationUrl = url ?? this.#req.path;

		this.#res.status(303).set('Content-Type', this.#MIME_TYPE_HTML).location(locationUrl).send(StringEscapeHtml.template`<!DOCTYPE html>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>See Other</title>
<h1>303 See Other</h1>
<p><a href="${locationUrl}">${locationUrl}</a>`);
	}

	/**
	 * 401 Unauthorized
	 *
	 * @param type - Authentication type <https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml>
	 * @param realm - A description of the protected area.
	 */
	send401(type: HttpAuthType, realm: string): void {
		this.#res
			.set('WWW-Authenticate', `${type} realm="${realm}"`)
			.status(401)
			.set('Content-Type', this.#MIME_TYPE_HTML)
			.sendFile(path.resolve(config.errorpage.path_401));
	}

	/**
	 * 403 Forbidden
	 */
	send403(): void {
		this.#res.status(403).set('Content-Type', this.#MIME_TYPE_HTML).sendFile(path.resolve(config.errorpage.path_403));
	}

	/**
	 * 404 Not Found
	 */
	send404(): void {
		this.#res.status(404).set('Content-Type', this.#MIME_TYPE_HTML).sendFile(path.resolve(config.errorpage.path_404));
	}

	/**
	 * 500 Internal Server Error
	 */
	send500(): void {
		this.#res.status(500).set('Content-Type', this.#MIME_TYPE_HTML).sendFile(path.resolve(config.errorpage.path_500));
	}
}
