/**
 * Trusted Types
 */
if (window.trustedTypes !== undefined) {
	window.trustedTypes.createPolicy('default', {
		createHTML: (inputText: string): string => {
			return inputText;
		},
		createURL: (inputUrl: string): string => {
			if (new URL(inputUrl).origin !== new URL(location.href).origin) {
				console.error(`[Trusted URL] URL with different origin are not allowed: ${inputUrl}`);
				throw new TypeError(`URL with different origin are not allowed: ${inputUrl}`);
			}

			return inputUrl;
		},
		createScriptURL: (inputUrl: string): string => {
			const ALLOWLIST: string[] = ['https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'];
			const ALLOWLIST_REGEXP: RegExp[] = [/^https:\/\/platform.twitter.com\/js\/horizon_tweet\.[0-9a-z]+\.js$/];

			if (!ALLOWLIST.includes(inputUrl) && !ALLOWLIST_REGEXP.some((allowUrl) => allowUrl.test(inputUrl))) {
				console.error(`[Trusted ScriptURL] URL not accepted: ${inputUrl}`);
				throw new TypeError(`URL not accepted: ${inputUrl}`);
			}

			return inputUrl;
		},
	});
}
