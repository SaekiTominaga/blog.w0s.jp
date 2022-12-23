import fs from 'fs';
import path from 'path';
import StringEscapeHtml from '@saekitominaga/string-escape-html';
import { Request, Response } from 'express';
import { NoName as Configure } from '../../configure/type/common.js';

type HttpAuthType = 'Basic' | 'Bearer' | 'Digest' | 'HOBA' | 'Mutual' | 'Negotiate' | 'OAuth' | 'SCRAM-SHA-1' | 'SCRAM-SHA-256' | 'vapid';

/**
 * HttpResponse
 */
export default class HttpResponse {
	readonly #req: Request;

	readonly #res: Response;

	readonly #config: Configure;

	readonly #MIME_HTML = 'text/html; charset=utf-8';

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Request
	 * @param {Configure} config - 共通設定ファイル
	 */
	constructor(req: Request, res: Response, config: Configure) {
		this.#req = req;
		this.#res = res;
		this.#config = config;
	}

	/**
	 * 最終更新日時を確認する（ドキュメントに変更がなければ 304 を返して終了、変更があれば Last-Modified ヘッダをセットする）
	 *
	 * @param {Date} lastModified - 今回のアクセスに対して発行する最終更新日時
	 *
	 * @returns {boolean} ドキュメントに変更がなければ true
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
	 * @param {object} data - 圧縮レスポンスボディ
	 * @param {string | object} data.body - レスポンスボディ
	 * @param {string | object} data.brotliBody - レスポンスボディ（Brotli 圧縮）
	 * @param {string} data.filePath - ファイルパス
	 * @param {string} data.brotliFilePath - Brotli ファイルパス
	 */
	async send200(data: { body?: string | Buffer; brotliBody?: string | Buffer; filePath?: string; brotliFilePath?: string }): Promise<void> {
		/* Brotli 圧縮 */
		if (this.#req.acceptsEncodings('br') === 'br') {
			let responseBody = data.brotliBody;
			if (responseBody === undefined && data.brotliFilePath !== undefined) {
				responseBody = await fs.promises.readFile(data.brotliFilePath);
			}

			if (responseBody !== undefined) {
				this.#res
					.setHeader('Content-Type', this.#MIME_HTML)
					.setHeader('Content-Encoding', 'br')
					.setHeader('Content-Security-Policy', this.#config.response.header.csp_html)
					.setHeader('Content-Security-Policy-Report-Only', this.#config.response.header.cspro_html)
					.send(responseBody);
				return;
			}
		}

		/* 無圧縮 */
		let responseBody = data.body;
		if (responseBody === undefined && data.filePath !== undefined) {
			responseBody = await fs.promises.readFile(data.filePath);
		}

		if (responseBody !== undefined) {
			this.#res
				.setHeader('Content-Type', this.#MIME_HTML)
				.setHeader('Content-Security-Policy', this.#config.response.header.csp_html)
				.setHeader('Content-Security-Policy-Report-Only', this.#config.response.header.cspro_html)
				.send(responseBody);
			return;
		}

		throw new Error('');
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
	 * @param {string} locationUrl - 遷移先 URL
	 */
	send301(locationUrl: string): void {
		this.#res.status(301).setHeader('Content-Type', this.#MIME_HTML).location(locationUrl).send(StringEscapeHtml.template`<!DOCTYPE html>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>Moved Permanently</title>
<h1>301 Moved Permanently</h1>
<p><a href="${locationUrl}">${locationUrl}</a>`);
	}

	/**
	 * 303 See Other
	 *
	 * @param {string} url - 遷移先 URL
	 */
	send303(url?: string): void {
		if (url === undefined && this.#req.method === 'GET') {
			/* 無限ループ回避 */
			throw new Error(`The request URL and 303 redirect destination are the same (${url}), risking an infinite loop.`);
		}

		const locationUrl = url ?? this.#req.path;

		this.#res.status(303).setHeader('Content-Type', this.#MIME_HTML).location(locationUrl).send(StringEscapeHtml.template`<!DOCTYPE html>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>See Other</title>
<h1>303 See Other</h1>
<p><a href="${locationUrl}">${locationUrl}</a>`);
	}

	/**
	 * 401 Unauthorized
	 *
	 * @param {string} type - Authentication type <https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml>
	 * @param {string} realm - A description of the protected area.
	 */
	send401(type: HttpAuthType, realm: string): void {
		this.#res
			.set('WWW-Authenticate', `${type} realm="${realm}"`)
			.status(401)
			.setHeader('Content-Type', this.#MIME_HTML)
			.sendFile(path.resolve(this.#config.errorpage.path_401));
	}

	/**
	 * 403 Forbidden
	 */
	send403(): void {
		this.#res.status(403).setHeader('Content-Type', this.#MIME_HTML).sendFile(path.resolve(this.#config.errorpage.path_403));
	}

	/**
	 * 404 Not Found
	 */
	send404(): void {
		this.#res.status(404).setHeader('Content-Type', this.#MIME_HTML).sendFile(path.resolve(this.#config.errorpage.path_404));
	}

	/**
	 * 500 Internal Server Error
	 */
	send500(): void {
		this.#res.status(500).setHeader('Content-Type', this.#MIME_HTML).sendFile(path.resolve(this.#config.errorpage.path_500));
	}
}
