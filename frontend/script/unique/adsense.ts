declare global {
	interface Window {
		adsbygoogle?: object[];
	}
}

/**
 * Google AdSense
 *
 * @param $target - 広告を表示する要素
 * @param intersectionObserverOptions - IntersectionObserver に渡すオプション
 */
const adsense = (
	$target: NodeListOf<Element> | HTMLCollectionOf<Element> | Element | null,
	intersectionObserverOptions?: Readonly<IntersectionObserverInit>,
): void => {
	if ($target === null) {
		return;
	}

	const SCRIPT_ID = 'script-adsbygoogle'; // 埋め込む <script> 要素の ID

	const observer = new IntersectionObserver((entries) => {
		if (entries.some((entry) => entry.isIntersecting)) {
			observer.disconnect();

			if (document.getElementById(SCRIPT_ID) === null) {
				const $script = document.createElement('script');
				$script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3297715785193216';
				$script.crossOrigin = 'anonymous';
				$script.async = true;
				$script.id = SCRIPT_ID;
				document.head.append($script);
			}
			(window.adsbygoogle ??= []).push({});
		}
	}, intersectionObserverOptions);

	if ($target instanceof Element) {
		observer.observe($target);
	} else {
		[...$target].forEach((element) => {
			observer.observe(element);
		});
	}
};
export default adsense;
