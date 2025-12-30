import buttonClipboard from '@w0s/button-clipboard';
import footnoteReferencePopover from '@w0s/footnote-reference-popover';
import Tab from '@w0s/tab';
import adsense from './unique/adsense.ts';
import reportJsError from './util/reportJsError.ts';
import trustedTypes from './util/trustedTypes.ts';

/* JS エラーレポート */
reportJsError();

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
