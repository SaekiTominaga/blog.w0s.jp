export interface TextData {
	text: string;
	code?: boolean;
}

/**
 * 記事メッセージのインラインデータ
 */
export default class InlineText {
	readonly #datas: TextData[];

	/**
	 * @param {string} input - 入力データ
	 */
	constructor(input: string) {
		this.#datas = [
			{
				text: input,
			},
		];
	}

	/**
	 * <code> 未処理のデータをひとつ取得する
	 *
	 * @returns {object} - データとそのデータが格納されたインデックス
	 */
	getNonfixCodeData(): { text: string; index: number } | undefined {
		const index = this.#datas.findIndex((data) => data.code === undefined);
		if (index === -1) {
			return undefined;
		}

		const data = this.#datas.at(index);
		if (data === undefined) {
			return undefined;
		}

		return {
			text: data.text,
			index: index,
		};
	}

	/**
	 * <code> でないデータをすべて取得する
	 *
	 * @returns {object[]} - データとそのデータが格納されたインデックス
	 */
	getNocodeDatas(): { text: string; index: number }[] {
		return this.#datas
			.map((data, index) => {
				const newData = {
					text: data.text,
					code: data.code,
					index: index,
				};
				return newData;
			})
			.filter((data) => data.code === undefined || !data.code);
	}

	/**
	 * データを置き換える
	 *
	 * @param {number} start - 配列を変更する先頭のインデックス
	 * @param {object[]} datas - 置き換えるデータ
	 */
	replace(start: number, datas: Readonly<TextData>[]): void {
		this.#datas.splice(start, 1, ...datas);
	}

	/**
	 * 最終的なデータを返す
	 *
	 * @returns {string} - データを HTML エスケープした文字列
	 */
	complete(): string {
		return this.#datas.map((data): string => data.text).join('');
	}
}
