import reportSameReferrer from '@w0s/report-same-referrer';
import reportJsError from './util/reportJsError.ts';

/**
 * 403, 404, 410 ページ
 */

/* JS エラーレポート */
reportJsError();

/* リファラーレポート */
await reportSameReferrer({
	fetch: {
		endpoint: 'https://report.w0s.jp/report/referrer',
		param: {
			documentURL: 'documentURL',
			referrer: 'referrer',
		},
		contentType: 'application/json',
	},
	validate: {
		referrer: {
			sames: ['https://w0s.jp'],
		},
	},
});
