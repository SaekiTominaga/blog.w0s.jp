/**
 * Trusted Types
 */
export default (): void => {
	window.trustedTypes?.createPolicy('default', {
		createHTML: (inputText: string): string => inputText,
		createURL: (inputUrl: string): string => {
			if (!URL.canParse(inputUrl)) {
				throw new TypeError(`[Trusted Types] Invalid URL format: ${inputUrl}`);
			}
			if (new URL(inputUrl).origin !== new URL(location.href).origin) {
				throw new TypeError(`[Trusted Types] URL with different origin are not allowed: ${inputUrl}`);
			}

			return inputUrl;
		},
		createScriptURL: (inputUrl: string): string => {
			if (!['https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3297715785193216'].includes(inputUrl)) {
				throw new TypeError(`[Trusted Types] This script URL is not allowed: ${inputUrl}`);
			}

			return inputUrl;
		},
	});
};
