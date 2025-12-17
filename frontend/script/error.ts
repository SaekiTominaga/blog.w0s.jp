import reportJsError from '@w0s/report-js-error';
import reportSameReferrer from '@w0s/report-same-referrer';

/**
 * 403, 404, 410 ページ
 */

/* JS エラーレポート */
reportJsError({
	fetch: {
		endpoint: 'https://report.w0s.jp/report/js',
		param: {
			documentURL: 'documentURL',
			message: 'message',
			filename: 'jsURL',
			lineno: 'lineNumber',
			colno: 'columnNumber',
		},
		contentType: 'application/json',
	},
	validate: {
		filename: {
			allows: [/^https:\/\/blog\.w0s\.jp\/script\/.+\.js$/u],
		},
		ua: {
			denys: [/Googlebot\/2.1;/u],
		},
	},
});

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
