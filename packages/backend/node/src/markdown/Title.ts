import StringEscapeHtml from '@saekitominaga/string-escape-html';

/**
 * 記事タイトルの処理
 */
export default class MarkdownTitle {
	#value: string;

	/**
	 * @param {string} input - 処理対象のテキスト
	 */
	constructor(input: string) {
		this.#value = StringEscapeHtml.escape(input);
	}

	/**
	 * 変換実行
	 *
	 * @returns {string} - 変換後の HTML 文字列
	 */
	mark(): string {
		this.#code();

		return this.#value;
	}

	/**
	 * <code>
	 */
	#code(): void {
		const CODE_OPEN = '`';
		const CODE_CLOSE = '`';

		/**
		 * 変換実行
		 *
		 * @param {number} fromIndex - 検索を始める位置
		 *
		 * @returns {number} 未処理文字列の開始位置（これ以上処理が不要なときは undefined）
		 */
		const convert = (fromIndex = 0): number | undefined => {
			const codeOpenIndex = this.#value.indexOf(CODE_OPEN, fromIndex);
			if (codeOpenIndex === -1) {
				return undefined;
			}
			const codeCloseIndex = this.#value.indexOf(CODE_CLOSE, codeOpenIndex + CODE_OPEN.length);
			if (codeCloseIndex === -1) {
				return undefined;
			}

			const beforeCodeValue = this.#value.substring(0, codeOpenIndex);
			const codeValue = this.#value.substring(codeOpenIndex + CODE_OPEN.length, codeCloseIndex);
			const afterCodeValue = this.#value.substring(codeCloseIndex + CODE_CLOSE.length);

			const converted = `${beforeCodeValue}<code>${codeValue}</code>`;
			const unconvertedIndex = converted.length;

			this.#value = `${converted}${afterCodeValue}`;

			return unconvertedIndex;
		};

		let unconvertedIndex = convert();
		while (unconvertedIndex !== undefined) {
			unconvertedIndex = convert(unconvertedIndex);
		}
	}
}
