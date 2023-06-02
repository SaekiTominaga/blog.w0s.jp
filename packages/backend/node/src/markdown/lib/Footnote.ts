export default class Footnote {
	/**
	 * 注釈要素の ID を生成する
	 *
	 * @param {number} no - 注釈連番
	 *
	 * @returns {string} 注釈要素の ID
	 */
	static getId(no: number): string {
		return String(no);
	}
}
