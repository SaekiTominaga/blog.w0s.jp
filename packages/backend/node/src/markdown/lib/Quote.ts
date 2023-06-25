import IsbnVerify from '@saekitominaga/isbn-verify';
import { regexp } from '../config.js';

interface MetaIsbn {
	value: string;
	valid: boolean;
}

export interface Meta {
	lang?: string;
	url?: string;
	isbn?: MetaIsbn;
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
		if (new RegExp(`^${regexp.lang}$`).test(meta)) {
			return {
				lang: meta,
			};
		}

		/* 絶対 URL */
		if (new RegExp(`^${regexp.absoluteUrl}$`).test(meta)) {
			return {
				url: meta,
			};
		}

		/* ISBN */
		if (new RegExp(`^${regexp.isbn}$`).test(meta)) {
			return {
				isbn: {
					value: meta,
					valid: new IsbnVerify(meta, { strict: true }).isValid(),
				},
			};
		}

		return {};
	}
}
