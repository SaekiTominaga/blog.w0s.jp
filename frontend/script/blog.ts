import buttonClipboard from '@w0s/button-clipboard';
import footnoteReferencePopover from '@w0s/footnote-reference-popover';
import reportJsError from '@w0s/report-js-error';
import Tab from '@w0s/tab';
import adsense from './unique/adsense.ts';
import trustedTypes from './util/trustedTypes.ts';

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

/* Trusted Types */
trustedTypes();

/* タブ */
if (document.querySelector('w0s-tab') !== null) {
	customElements.define('w0s-tab', Tab);
}

/* ツールチップ */
footnoteReferencePopover(document.querySelectorAll('.js-footnote-reference-popover'));

/* クリップボード書き込みボタン */
buttonClipboard(document.querySelectorAll('.js-button-clipboard'));

/* Google AdSense */
adsense(document.querySelectorAll('.js-ads-google'), { rootMargin: '100px' });
