import ButtonClipboard from '@w0s/button-clipboard';
import ReportJsError from '@w0s/report-js-error';
import Tab from '@w0s/tab';
import FootnoteReferencePopover from '@w0s/footnote-reference-popover';
import GoogleAdsense from './unique/GoogleAdsense.js';

/* JS エラーレポート */
new ReportJsError('https://report.w0s.jp/report/js', {
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
});

if (window.customElements !== undefined) {
	/* タブ */
	if (document.querySelector('w0s-tab') !== null) {
		customElements.define('w0s-tab', Tab);
	}

	/* ツールチップ */
	for (const targetElement of document.querySelectorAll<HTMLAnchorElement>('.js-footnote-reference-popover')) {
		new FootnoteReferencePopover(targetElement);
	}

	/* クリップボード書き込みボタン */
	for (const targetElement of document.querySelectorAll<HTMLButtonElement>('.js-button-clipboard')) {
		new ButtonClipboard(targetElement);
	}
}

/* Google AdSense */
for (const adsGoogleElement of document.querySelectorAll('.js-ads-google')) {
	new GoogleAdsense(adsGoogleElement).init('100px');
}
