import buttonClipboard from '@w0s/button-clipboard';
import reportJsError from '@w0s/report-js-error';
import Tab from '@w0s/tab';
import footnoteReferencePopover from '@w0s/footnote-reference-popover';
import GoogleAdsense from './unique/GoogleAdsense.js';

/* JS エラーレポート */
reportJsError('https://report.w0s.jp/report/js', {
	fetchParam: {
		documentURL: 'documentURL',
		message: 'message',
		filename: 'jsURL',
		lineno: 'lineNumber',
		colno: 'columnNumber',
	},
	fetchContentType: 'application/json',
	allowFilenames: [/^https:\/\/blog\.w0s\.jp\/script\/.+\.js$/],
	denyUAs: [/Googlebot\/2.1;/],
});

if (window.customElements !== undefined) {
	/* タブ */
	if (document.querySelector('w0s-tab') !== null) {
		customElements.define('w0s-tab', Tab);
	}

	/* ツールチップ */
	footnoteReferencePopover(document.querySelectorAll('.js-footnote-reference-popover'));

	/* クリップボード書き込みボタン */
	buttonClipboard(document.querySelectorAll('.js-button-clipboard'));
}

/* Google AdSense */
for (const adsGoogleElement of document.querySelectorAll('.js-ads-google')) {
	new GoogleAdsense(adsGoogleElement).init('100px');
}
