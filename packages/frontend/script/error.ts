import PortalAnimation from '@w0s/portal-animation';
import ReportJsError from '@w0s/report-js-error';
import ReportSameReferrer from '@w0s/report-same-referrer';

/**
 * 403, 404, 410 ページ
 */
const { portalHost } = window;
if (portalHost === null || portalHost === undefined /* <potal> 未対応ブラウザは undefined になる */) {
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

	/* トップページの埋め込み */
	if (window.HTMLPortalElement !== undefined /* <potal> 要素をサポートしているか */ && window.customElements !== undefined) {
		const portalElement = document.getElementById('top-portal') as HTMLPortalElement | null;

		if (portalElement !== null) {
			portalElement.src = '/';
			portalElement.title = '富永日記帳（トップページ）';
			portalElement.hidden = false;

			customElements.define('w0s-portal', PortalAnimation);
		}
	}
}
