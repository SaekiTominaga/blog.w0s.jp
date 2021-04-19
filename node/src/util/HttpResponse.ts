import path from 'path';
import { NoName as Configure } from '../../configure/type/Common.js';
import { Request, Response } from 'express';

/**
 * HttpResponse
 */
 export default class HttpResponse {
	#res: Response;
	#config: Configure;

	constructor(res: Response, config: Configure) {
		this.#res = res;
		this.#config = config;
	}

	/**
	 * Appends the specified value to the HTTP response header field. If the header is not already set, it creates the header with the specified value. The value parameter can be a string or an array.
	 *
	 * @param {string} field - HTTP response header field
	 * @param {object} value - HTTP response header value
	 *
	 * @see {@link https://expressjs.com/ja/4x/api.html#res.append}
	 */
	append(field: string, value?: string | string[] /* eslint-disable-line @typescript-eslint/ban-types */): void {
		this.#res.append(field, value);
	}

	/**
	 * Renders a view and sends the rendered HTML string to the client. Optional parameters
	 *
	 * @param {string} view - a string that is the file path of the view file to render.
	 * @param {object} options - an object whose properties define local variables for the view.
	 * @param {Function} callback - a callback function. If provided, the method returns both the possible error and rendered string, but does not perform an automated response. When an error occurs, the method invokes next(err) internally.
	 *
	 * @see {@link https://expressjs.com/ja/4x/api.html#res.render}
	 */
	render(view: string, options?: object /* eslint-disable-line @typescript-eslint/ban-types */, callback?: (err: Error, html: string) => void): void {
		this.#res.render(view, options, callback);
	}

	/**
	 * Transfers the file at the given path. Sets the Content-Type response HTTP header field based on the filename’s extension. Unless the root option is set in the options object, path must be an absolute path to the file.
	 *
	 * @param {string} path -
	 * @param {object} options -
	 * @param {Function} fn -
	 *
	 * @see {@link https://expressjs.com/ja/4x/api.html#res.sendFile}
	 */
	sendFile(path: string, options?: object /* eslint-disable-line @typescript-eslint/ban-types */, fn?: (err: Error) => void): void {
		this.#res.sendFile(path, options, fn);
	}

	/**
	 * 最終更新日時を確認する（ドキュメントに変更がなければ 304 を返して終了、変更があれば Last-Modified ヘッダをセットする）
	 *
	 * @param {Request} req - Request
	 * @param {Date} lastModified - 今回のアクセスに対して発行する最終更新日時
	 *
	 * @returns {boolean} ドキュメントに変更がなければ true
	 */
	checkLastModified(req: Request, lastModified: Date): boolean {
		const ifModifiedSince = req.get('If-Modified-Since');
		if (ifModifiedSince !== undefined) {
			if (Math.floor(lastModified.getTime() / 1000) <= Math.floor(new Date(ifModifiedSince).getTime() / 1000)) {
				this.#res.status(304).end();
				return true;
			}
		}

		this.#res.set('Last-Modified', lastModified.toUTCString());
		return false;
	}

	/**
	 * 204 No Content
	 */
	send204(): void {
		this.#res.status(204).end();
	}

	/**
	 * 403 Forbidden
	 */
	send403(): void {
		this.#res.status(403).sendFile(path.resolve(this.#config.errorpage.path_403));
	}

	/**
	 * 404 Not Found
	 */
	send404(): void {
		this.#res.status(404).sendFile(path.resolve(this.#config.errorpage.path_404));
	}
}
