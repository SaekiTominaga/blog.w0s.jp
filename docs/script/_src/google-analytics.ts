/* eslint @typescript-eslint/ban-ts-comment: off */
// @ts-nocheck

/**
 * Google Analytics
 */
function gtag() {
	dataLayer.push(arguments); // eslint-disable-line prefer-rest-params
}

if (window.portalHost === null || window.portalHost === undefined) {
	try {
		if (localStorage.getItem('ga-disable') === 'true') {
			window['ga-disable-G-SZYWFCF4JS'] = true;
		}
	} catch (e) {}

	window.dataLayer = window.dataLayer || [];

	gtag('js', new Date());
	gtag('config', 'G-SZYWFCF4JS', { anonymize_ip: true });
}
