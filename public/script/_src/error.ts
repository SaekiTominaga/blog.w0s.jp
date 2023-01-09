import PortalAnimation from '@saekitominaga/customelements-portal';
import ReportJsError from '@saekitominaga/report-js-error';
import ReportSameReferrer from '@saekitominaga/report-same-referrer';

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
	}).init();

	/* リファラーレポート */
	new ReportSameReferrer('https://report.w0s.jp/referrer', {
		fetchParam: {
			location: 'location',
			referrer: 'referrer',
		},
		fetchContentType: 'application/json',
		same: ['https://w0s.jp'],
	}).init();

	/* トップページの埋め込み */
	if (window.HTMLPortalElement !== undefined /* <potal> 要素をサポートしているか */ && window.customElements !== undefined) {
		const portalElement = <HTMLPortalElement | null>document.getElementById('top-portal');

		if (portalElement !== null) {
			portalElement.src = '/';
			portalElement.title = '富永日記帳（トップページ）';
			portalElement.hidden = false;

			customElements.define('w0s-portal', PortalAnimation);
		}
	}
}
