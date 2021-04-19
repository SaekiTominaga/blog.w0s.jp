import PaapiItemImageUrlParser from '../../../node_modules/@saekitominaga/paapi-item-image-url-parser/dist/PaapiItemImageUrlParser.min.js';

interface JsonAmazonDp {
	a: string; // asin
	t: string; // title
	b?: string; // binding
	d?: number; // date
	i?: string; // image_url
}

/**
 * Amazon 商品広告情報を取得し、サイドバーに挿入する
 */
export default class {
	#templateElement: HTMLTemplateElement;

	/**
	 * @param {object} templateElement - 挿入するページに存在する <tempalte> 要素
	 */
	constructor(templateElement: HTMLTemplateElement) {
		this.#templateElement = templateElement;
	}

	async init(): Promise<void> {
		const jsonName = (<HTMLMetaElement | null>document.querySelector('meta[name="w0s:sidebar:amazon"]'))?.content;
		if (jsonName === undefined) {
			return;
		}

		/* エンドポイントから JSON ファイルを取得する */
		const jsonDataList = await this._fetch(jsonName);

		/* 取得したデータを HTML ページ内に挿入する */
		this._insert(jsonDataList);

		/* 直近の祖先要素の hidden 状態を解除する */
		const ancestorHiddenElement = <HTMLElement | null>this.#templateElement.closest('[hidden]');
		if (ancestorHiddenElement !== null) {
			ancestorHiddenElement.hidden = false;
		}
	}

	/**
	 * エンドポイントから JSON ファイルを取得する
	 *
	 * @param {string} jsonName - 取得する JSON の名前
	 *
	 * @returns {object[]} Amazon 商品情報のデータ
	 */
	private async _fetch(jsonName: string): Promise<JsonAmazonDp[]> {
		const response = await fetch(`https://data.w0s.jp/amazondp/${jsonName}.json`);
		if (!response.ok) {
			throw new Error(`"${response.url}" is ${response.status} ${response.statusText}`);
		}

		return await response.json();
	}

	/**
	 * Amazon 商品情報のデータを HTML ページ内に挿入する
	 *
	 * @param {object[]} jsonDataList - JSON から取得した Amazon 商品情報のデータ
	 */
	private _insert(jsonDataList: JsonAmazonDp[]): void {
		const nowTime = Date.now();
		const nowYear = new Date().getFullYear();

		const fragment = document.createDocumentFragment();

		for (const jsonData of jsonDataList) {
			const jsonDataAsin = jsonData.a; // ASIN
			const jsonDataText = jsonData.t; // タイトル
			const jsonDataBinding = jsonData.b; // カテゴリ
			const jsonDataDate = jsonData.d; // 発売日
			const jsonDataImage = jsonData.i; // 画像URL

			const templateElementClone = <DocumentFragment>this.#templateElement.content.cloneNode(true);

			const dpAnchorElement = <HTMLAnchorElement>templateElementClone.querySelector('a');
			dpAnchorElement.href = `https://www.amazon.co.jp/dp/${jsonDataAsin}?tag=w0s.jp-22&linkCode=ogi&th=1&psc=1`;

			if (jsonDataImage !== undefined) {
				const dpImageElement = <HTMLImageElement>templateElementClone.querySelector('.js-image');

				const paapiItemImageUrlParser = new PaapiItemImageUrlParser(new URL(jsonDataImage));
				paapiItemImageUrlParser.setSize(160);
				dpImageElement.src = paapiItemImageUrlParser.toString();

				paapiItemImageUrlParser.setSizeMultiply(2);
				dpImageElement.srcset = `${paapiItemImageUrlParser} 2x`;
			}

			const dpTitleElement = <HTMLElement>templateElementClone.querySelector('.js-title');
			dpTitleElement.insertAdjacentText('afterbegin', jsonDataText);

			if (jsonDataBinding !== undefined) {
				const dpBindingElement = <HTMLElement>templateElementClone.querySelector('.js-binding');
				dpBindingElement.textContent = jsonDataBinding;
				dpBindingElement.hidden = false;
			}

			if (jsonDataDate !== undefined) {
				const dpDate = new Date(jsonDataDate * 1000);
				const year = dpDate.getFullYear();
				const month = dpDate.getMonth() + 1;
				const date = dpDate.getDate();

				const dpDateElement = <HTMLElement>templateElementClone.querySelector(dpDate.getTime() <= nowTime ? '.js-date-past' : '.js-date-future');

				const dpTimeElement = dpDateElement.getElementsByTagName('time')[0];
				dpTimeElement.dateTime = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
				dpTimeElement.textContent = year !== nowYear ? `${year}年${month}月${date}日` : `${month}月${date}日`;

				dpDateElement.hidden = false;
			}

			fragment.appendChild(templateElementClone);
		}

		this.#templateElement.parentNode?.appendChild(fragment);
	}
}
