declare global {
	interface Window {
		adsbygoogle?: object[];
	}
}

/**
 * Google AdSense
 *
 * @param targetElementOrElements - 広告を表示する要素
 * @param intersectionObserverOptions - IntersectionObserver に渡すオプション
 */
const adsense = (
	targetElementOrElements: NodeListOf<Element> | HTMLCollectionOf<Element> | Element | null,
	intersectionObserverOptions?: IntersectionObserverInit,
): void => {
	if (targetElementOrElements === null) {
		return;
	}

	const SCRIPT_ID = 'script-adsbygoogle'; // 埋め込む <script> 要素の ID

	const observer = new IntersectionObserver((entries) => {
		if (entries.some((entry) => entry.isIntersecting)) {
			observer.disconnect();

			if (document.getElementById(SCRIPT_ID) === null) {
				const scriptElement = document.createElement('script');
				scriptElement.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
				scriptElement.async = true;
				scriptElement.id = SCRIPT_ID;
				document.head.append(scriptElement);
			}
			(window.adsbygoogle ??= []).push({});
		}
	}, intersectionObserverOptions);

	if (targetElementOrElements instanceof Element) {
		observer.observe(targetElementOrElements);
	} else {
		for (const element of targetElementOrElements) {
			observer.observe(element);
		}
	}
};
export default adsense;
