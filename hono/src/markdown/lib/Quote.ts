import IsbnVerify from '@w0s/isbn-verify';
import configRemark from '../../config/remark.js';

interface MetaIsbn {
	value: string;
	valid: boolean;
}

export interface Meta {
	lang?: string;
	url?: string;
	isbn?: MetaIsbn;
	amazon?: string;
}

export default class Quote {
	/**
	 * 引用のメタ情報を分類する
	 *
	 * @param meta - メタ情報
	 *
	 * @returns 分類されたメタ情報
	 */
	static classifyMeta(meta: string): Meta {
		/* 言語 */
		if (new RegExp(`^${configRemark.regexp.lang}$`).test(meta)) {
			return {
				lang: meta,
			};
		}

		/* 絶対 URL */
		if (new RegExp(`^${configRemark.regexp.absoluteUrl}$`).test(meta)) {
			return {
				url: meta,
			};
		}

		/* ISBN */
		if (new RegExp(`^${configRemark.regexp.isbn}$`).test(meta)) {
			return {
				isbn: {
					value: meta,
					valid: new IsbnVerify(meta, { strict: true }).isValid(),
				},
			};
		}

		/* Amazon 商品ページへのリンク */
		if (new RegExp(`^amazon:${configRemark.regexp.asin}$`).test(meta)) {
			return {
				amazon: meta,
			};
		}

		return {};
	}
}
