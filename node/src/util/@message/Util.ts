export default class Util {
	/**
	 * 注釈要素の ID を生成する
	 *
	 * @param {number} entryId - 記事 ID
	 * @param {number} no - 注釈連番
	 *
	 * @returns {string} 注釈要素の ID
	 */
	static getFootnoteId(entryId: number, no: number): string {
		return `${entryId}-${no}`;
	}
}
