import ReportJsError from '@w0s/report-js-error';
import ReportSameReferrer from '@w0s/report-same-referrer';

/**
 * 403, 404, 410 ページ
 */

/* JS エラーレポート */
new ReportJsError('https://report.w0s.jp/js', {
	fetchParam: {
		location: 'location',
		message: 'message',
		filename: 'filename',
		lineno: 'lineno',
		colno: 'colno',
	},
	fetchContentType: 'application/json',
	allowFilenames: [/^https:\/\/blog\.w0s\.jp\/script\/.+\.m?js$/],
	denyUAs: [/Googlebot\/2.1;/],
});

/* リファラーレポート */
await new ReportSameReferrer('https://report.w0s.jp/referrer', {
	fetchParam: {
		location: 'location',
		referrer: 'referrer',
	},
	fetchContentType: 'application/json',
	same: ['https://w0s.jp'],
}).report();
