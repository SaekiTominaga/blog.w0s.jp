import Portal from '@saekitominaga/customelements-portal';
import ReportJsError from '@saekitominaga/report-js-error';
import ReportSameReferrer from '@saekitominaga/report-same-referrer';

const portalHost = window.portalHost;
if (portalHost === null || portalHost === undefined /* 未対応ブラウザは undefined になる */) {
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
		allowFilenames: [/^https:\/\/blog\.w0s\.jp\/script\/.+\.js$/],
		denyUAs: [/Googlebot\/2.1;/],
	}).init();

	/* リファラーレポート */
	const reportSameReferrer = new ReportSameReferrer('https://report.w0s.jp/referrer', {
		fetchParam: {
			location: 'location',
			referrer: 'referrer',
		},
		fetchContentType: 'application/json',
	});
	reportSameReferrer.init();

	/* トップページの埋め込み */
	const supportPortalElement = window.HTMLPortalElement !== undefined; // <potal> 要素をサポートしているか
	if (supportPortalElement && window.customElements !== undefined) {
		const topPortalElement = <HTMLPortalElement | null>document.getElementById('top-portal');

		if (topPortalElement !== null) {
			topPortalElement.src = '/';
			topPortalElement.title = '富永日記帳（トップページ）';
			topPortalElement.hidden = false;
			customElements.define('w0s-portal', Portal);
		}
	}
}
