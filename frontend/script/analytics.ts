interface Window {
	_paq?: string[][];
}

/**
 * Matomo Analytics
 */
var _paq: string[][] = (window._paq ??= []);
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);
_paq.push(['setTrackerUrl', 'https://analytics.w0s.jp/matomo/matomo.php']);
_paq.push(['setSiteId', '2']);
