import path from 'path';
import { NoName as Configure } from '../../configure/type/common.js';
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
