export default class Footnote {
	/**
	 * 脚注要素の ID を生成する
	 *
	 * @param {string} id - 脚注 ID
	 *
	 * @returns {string} 脚注要素の ID
	 */
	static getId(id: string): string {
		return `footnote-${id}`;
	}

	/**
	 * 脚注参照要素の ID を生成する
	 *
	 * @param {string} id - 脚注 ID
	 *
	 * @returns {string} 脚注参照要素の ID
	 */
	static getReferenceId(id: string): string {
		return `footnote-ref-${id}`;
	}
}
