import ButtonClipboard from '@saekitominaga/customelements-button-clipboard';
import ButtonShare from '@saekitominaga/customelements-button-share';
import GoogleAdsense from './unique/GoogleAdsense';
import ReportJsError from '@saekitominaga/report-js-error';
import SidebarAmazonPa from './unique/SidebarAmazonPa';
import StyleSheetPrint from './unique/StyleSheetPrint';
import Tab from '@saekitominaga/customelements-tab';
import Tooltip from '@saekitominaga/customelements-tooltip';
import TooltipTrigger from '@saekitominaga/customelements-tooltip-trigger';

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

if (window.customElements !== undefined) {
	/* タブ */
	if (document.querySelector('w0s-tab') !== null) {
		customElements.define('w0s-tab', Tab);
	}

	/* ツールチップ */
	if (document.querySelector('a[is="w0s-tooltip-trigger"]') !== null) {
		customElements.define('w0s-tooltip', Tooltip);
		customElements.define('w0s-tooltip-trigger', TooltipTrigger, {
			extends: 'a',
		});
	}

	/* クリップボード書き込みボタン */
	if (document.querySelector('button[is="w0s-clipboard"]') !== null) {
		customElements.define('w0s-clipboard', ButtonClipboard, {
			extends: 'button',
		});
	}

	/* シェアボタン */
	if (document.querySelector('button[is="w0s-share-button"]') !== null) {
		customElements.define('w0s-share-button', ButtonShare, {
			extends: 'button',
		});
	}
}

/* Amazon 商品広告 */
new SidebarAmazonPa(<HTMLTemplateElement>document.getElementById('sidebar-amazon-pa-template')).init();

/* 印刷用スタイルシート */
new StyleSheetPrint(<HTMLElement>document.getElementById('stylesheet-print')).init();

/* Google AdSense */
for (const adsGoogleElement of document.querySelectorAll('.js-ads-google')) {
	new GoogleAdsense(adsGoogleElement).init('100px');
}
