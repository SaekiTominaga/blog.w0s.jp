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
				throw new Error(`[Trusted URL] URL not accepted: ${inputUrl}`);
			}

			return inputUrl;
		},
		createScriptURL: (inputUrl: string): string => {
			const ALLOWLIST: string[] = ['https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'];
			const ALLOWLIST_REGEXP: RegExp[] = [/^https:\/\/platform.twitter.com\/js\/horizon_tweet\.[0-9a-z]+\.js$/];

			if (!ALLOWLIST.includes(inputUrl) && !ALLOWLIST_REGEXP.some((allowUrl) => allowUrl.test(inputUrl))) {
				throw new Error(`[Trusted ScriptURL] URL not accepted: ${inputUrl}`);
			}

			return inputUrl;
		},
	});
}
