/**
 * 代替スタイルシートの切替機構を持たないブラウザ向けに印刷用スタイルを強制適用する
 */
export default class {
	#printStyleSheetElement: HTMLLinkElement;
	#preferredStyleSheetList: StyleSheet[] = []; // 優先スタイルシート

	#windowBeforePrintEventListener: () => void;
	#windowAfterPrintEventListener: () => void;

	/**
	 * @param {object} printStyleSheetElement - 印刷用スタイルシートを指定した要素
	 */
	constructor(printStyleSheetElement: HTMLLinkElement) {
		this.#printStyleSheetElement = printStyleSheetElement;

		this.#windowBeforePrintEventListener = this._windowBeforePrintEvent.bind(this);
		this.#windowAfterPrintEventListener = this._windowAfterPrintEvent.bind(this);
	}

	/**
	 * 初期処理
	 */
	init(): void {
		if (this._canSelectAlternateStyleSheets()) {
			return;
		}

		const printStyleSheetSetName = this.#printStyleSheetElement.title; // 対象の印刷用スタイルシートの名前
		if (printStyleSheetSetName === '') {
			throw new Error('Alternate stylesheets has no name (`title` attribute).');
		}

		for (const styleSheet of document.styleSheets) {
			const styleSheetSetName = styleSheet.title;
			if (styleSheetSetName !== null) {
				if (styleSheetSetName === printStyleSheetSetName) {
					/* 対象の印刷用スタイルシートと同じ名前のスタイルシートは新たに <link> 要素を生成する */
					const printStyleSheetElement = document.createElement('link');
					printStyleSheetElement.rel = 'stylesheet';
					printStyleSheetElement.href = <string>styleSheet.href; // href 属性が指定されていない <link rel="stylesheet"> は document.styleSheets に含まれないので null チェックは不要
					printStyleSheetElement.media = 'print';
					document.head.appendChild(printStyleSheetElement);
				} else if (!(<HTMLLinkElement>styleSheet.ownerNode).relList.contains('alternate')) {
					/* title 属性が存在し、 rel 属性値に 'alternate' が含まれない場合は優先スタイルシート */
					this.#preferredStyleSheetList.push(styleSheet);
				}
			}
		}

		if (this.#preferredStyleSheetList.length > 0) {
			window.addEventListener('beforeprint', this.#windowBeforePrintEventListener);
			window.addEventListener('afterprint', this.#windowAfterPrintEventListener);
		}
	}

	/**
	 * ブラウザが代替スタイルシートの切替機構に対応しているか
	 *
	 * @returns {boolean} 切替機構に対応していれば true （ドキュメント内に代替スタイルシートが存在しない場合は常に false を返す）
	 */
	private _canSelectAlternateStyleSheets(): boolean {
		return [...document.styleSheets].some((styleSheet) => {
			return styleSheet.title !== null && (<HTMLLinkElement>styleSheet.ownerNode).relList.contains('alternate') && styleSheet.disabled;
		});
	}

	/**
	 * window - beforeprint の処理
	 */
	private _windowBeforePrintEvent(): void {
		for (const preferredStyleSheet of this.#preferredStyleSheetList) {
			preferredStyleSheet.disabled = true;
		}
	}

	/**
	 * window - afterprint の処理
	 */
	private _windowAfterPrintEvent(): void {
		for (const preferredStyleSheet of this.#preferredStyleSheetList) {
			preferredStyleSheet.disabled = true;
		}
	}
}
