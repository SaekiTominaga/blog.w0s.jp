import ReportJsError from '@w0s/report-js-error';
import ReportSameReferrer from '@w0s/report-same-referrer';

/**
 * 403, 404, 410 ページ
 */

/* JS エラーレポート */
new ReportJsError('https://report.w0s.jp/report/js', {
	fetchParam: {
		location: 'documentURL',
		message: 'message',
		filename: 'jsURL',
		lineno: 'lineNumber',
		colno: 'columnNumber',
	},
	fetchContentType: 'application/json',
	allowFilenames: [/^https:\/\/blog\.w0s\.jp\/script\/.+\.m?js$/],
	denyUAs: [/Googlebot\/2.1;/],
});

/* リファラーレポート */
await new ReportSameReferrer('https://report.w0s.jp/report/referrer', {
	fetchParam: {
		location: 'documentURL',
		referrer: 'referrer',
	},
	fetchContentType: 'application/json',
	same: ['https://w0s.jp'],
}).report();
