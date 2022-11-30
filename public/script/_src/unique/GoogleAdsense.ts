declare global {
	interface Window {
		adsbygoogle: unknown[];
	}
}

/**
 * Google AdSense
 */
export default class GoogleAdsense {
	#thisElement: Element;

	#SCRIPT_ID = 'script-adsbygoogle'; // 埋め込む <script> 要素の ID

	/**
	 * @param {object} thisElement - 広告を表示する要素
	 */
	constructor(thisElement: Element) {
		this.#thisElement = thisElement;
	}

	/**
	 * 初期処理
	 *
	 * @param {string} rootMargin - ルート周りのマージン
	 */
	init(rootMargin = '0px'): void {
		if (window.IntersectionObserver === undefined) {
			/* Safari 11, iOS Safari 11-12.1 */
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					observer.disconnect();

					if (document.getElementById(this.#SCRIPT_ID) === null) {
						const scriptElement = document.createElement('script');
						scriptElement.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
						scriptElement.async = true;
						scriptElement.id = this.#SCRIPT_ID;
						document.head.append(scriptElement);
					}
					(window.adsbygoogle = window.adsbygoogle || []).push({});
				}
			},
			{
				rootMargin: rootMargin,
			}
		);

		observer.observe(this.#thisElement);
	}
}
