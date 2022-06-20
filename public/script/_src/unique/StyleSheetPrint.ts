/**
 * 印刷時に印刷用スタイルを強制適用する
 */
export default class {
	readonly #alternatePrintStyleSheetElement: HTMLLinkElement;
	readonly #insertedPrintStyleSheetElements: HTMLLinkElement[] = [];

	readonly #windowBeforePrintEventListener: () => void;

	/**
	 * @param {object} alternatePrintStyleSheetElement - 印刷用スタイルシートと見なす要素
	 */
	constructor(alternatePrintStyleSheetElement: HTMLLinkElement) {
		if (alternatePrintStyleSheetElement.title === '') {
			throw new Error('Alternate stylesheets has no name (`title` attribute).');
		}

		this.#alternatePrintStyleSheetElement = alternatePrintStyleSheetElement;

		this.#windowBeforePrintEventListener = this.#windowBeforePrintEvent.bind(this);
	}

	/**
	 * 初期処理
	 */
	init(): void {
		window.addEventListener('beforeprint', this.#windowBeforePrintEventListener);
	}

	/**
	 * window - beforeprint の処理
	 */
	#windowBeforePrintEvent(): void {
		if (this.#insertedPrintStyleSheetElements.length === 0) {
			const styleSheets = [...document.styleSheets];
			for (const styleSheet of styleSheets.filter((styleSheet) => styleSheet.title === this.#alternatePrintStyleSheetElement.title)) {
				if (styleSheet.href === null) {
					continue;
				}

				/* 対象の印刷用スタイルシートと同じ名前を持つスタイルシートは新たに <link> 要素を生成する */
				const printStyleSheetElement = document.createElement('link');
				printStyleSheetElement.rel = 'stylesheet';
				printStyleSheetElement.href = styleSheet.href;
				printStyleSheetElement.media = 'print';

				if (this.#insertedPrintStyleSheetElements.length === 0) {
					const lastStyleSheet = styleSheets.at(-1)?.ownerNode;
					if (lastStyleSheet !== null && lastStyleSheet !== undefined && 'insertAdjacentElement' in lastStyleSheet) {
						lastStyleSheet.insertAdjacentElement('afterend', printStyleSheetElement);
					}
				} else {
					this.#insertedPrintStyleSheetElements.at(-1)?.insertAdjacentElement('afterend', printStyleSheetElement);
				}

				this.#insertedPrintStyleSheetElements.push(printStyleSheetElement);
			}
		}
	}
}
