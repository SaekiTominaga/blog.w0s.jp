'use strict';

/**
 * Trusted Types
 */
if (window.trustedTypes !== undefined) {
	window.trustedTypes.createPolicy('default', {
		createHTML: (inputText: string): string => inputText,
		createURL: (inputUrl: string): string => {
			if (new URL(inputUrl).origin !== new URL(location.href).origin) {
				throw new TypeError(`URL with different origin are not allowed: ${inputUrl}`);
			}

			return inputUrl;
		},
		createScriptURL: (inputUrl: string): string => {
			const ALLOW_URLS: string[] = ['https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'];
			const ALLOW_ORIGINS: string[] = [];
			const ALLOW_REGEXPS: RegExp[] = [];

			if (!ALLOW_URLS.includes(inputUrl) && !ALLOW_ORIGINS.includes(new URL(inputUrl).origin) && !ALLOW_REGEXPS.some((allow) => allow.test(inputUrl))) {
				throw new TypeError(`URL not accepted: ${inputUrl}`);
			}

			return inputUrl;
		},
	});
}
