import IsbnVerify from '@w0s/isbn-verify';
import config from '../config.ts';

interface MetaIsbn {
	value: string;
	valid: boolean;
}

export interface Meta {
	lang?: string;
	url?: string;
	isbn?: MetaIsbn;
}

/**
 * 引用のメタ情報を分類する
 *
 * @param meta - メタ情報
 *
 * @returns 分類されたメタ情報
 */
export const classifyMeta = (meta: string): Meta => {
	/* 言語 */
	if (new RegExp(`^${config.regexp.lang}$`, 'v').test(meta)) {
		return {
			lang: meta,
		};
	}

	/* 絶対 URL */
	if (new RegExp(`^${config.regexp.absoluteUrl}$`, 'v').test(meta)) {
		return {
			url: meta,
		};
	}

	/* ISBN */
	if (new RegExp(`^${config.regexp.isbn}$`, 'v').test(meta)) {
		return {
			isbn: {
				value: meta,
				valid: new IsbnVerify(meta, { strict: true }).isValid(),
			},
		};
	}

	return {};
};
