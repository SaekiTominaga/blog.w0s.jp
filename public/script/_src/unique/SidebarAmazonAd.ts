import PaapiItemImageUrlParser from '@saekitominaga/paapi-item-image-url-parser';

interface JsonColumn {
	a: string; // ASIN
	t: string; // Title
	b?: string; // Binding
	d?: number; // Date
	i?: string; // Image URL
	w?: number; // Image Width
	h?: number; // Image Height
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

	/**
	 * 初期処理
	 */
	async init(): Promise<void> {
		const jsonName = (<HTMLMetaElement | null>document.querySelector('meta[name="w0s:sidebar:amazon"]'))?.content;
		if (jsonName === undefined) {
			return;
		}

		/* エンドポイントから JSON ファイルを取得する */
		const jsonDataList = await this.fetch(jsonName);

		/* 取得したデータを HTML ページ内に挿入する */
		this.insert(jsonDataList);

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
	private async fetch(jsonName: string): Promise<JsonColumn[]> {
		const response = await fetch(`https://data.w0s.jp/amazon-ads/${jsonName}.json`);
		if (!response.ok) {
			throw new Error(`"${response.url}" is ${response.status} ${response.statusText}`);
		}

		return await response.json();
	}

	/**
	 * Amazon 商品情報のデータを HTML ページ内に挿入する
	 *
	 * @param {object[]} jsonData - JSON から取得した Amazon 商品情報のデータ
	 */
	private insert(jsonData: JsonColumn[]): void {
		const nowTime = Date.now();
		const nowYear = new Date().getFullYear();

		const fragment = document.createDocumentFragment();

		for (const jsonColumn of jsonData) {
			const asin = jsonColumn.a; // ASIN
			const title = jsonColumn.t; // タイトル
			const binding = jsonColumn.b; // カテゴリ
			const date = jsonColumn.d !== undefined ? new Date(jsonColumn.d) : undefined; // 発売日
			const imageUrl = jsonColumn.i; // 画像 URL
			const imageWidth = jsonColumn.w; // 画像幅
			const imageHeight = jsonColumn.h; // 画像高さ

			const templateElementClone = <DocumentFragment>this.#templateElement.content.cloneNode(true);

			const dpAnchorElement = <HTMLAnchorElement>templateElementClone.querySelector('a');
			dpAnchorElement.href = `https://www.amazon.co.jp/dp/${asin}?tag=w0s.jp-22&linkCode=ogi&th=1&psc=1`;

			if (imageUrl !== undefined) {
				const BASE_SIZE = 160;

				const dpImageElement = <HTMLImageElement>templateElementClone.querySelector('.js-image');

				const paapiItemImageUrlParser = new PaapiItemImageUrlParser(new URL(imageUrl));
				paapiItemImageUrlParser.setSize(BASE_SIZE);
				dpImageElement.src = paapiItemImageUrlParser.toString();

				paapiItemImageUrlParser.setSizeMultiply(2);
				dpImageElement.srcset = `${paapiItemImageUrlParser} 2x`;

				if (imageWidth !== undefined && imageHeight !== undefined) {
					if (imageWidth > imageHeight) {
						dpImageElement.width = BASE_SIZE;
						dpImageElement.height = Math.ceil((imageHeight / imageWidth) * BASE_SIZE);
					} else {
						dpImageElement.width = Math.ceil((imageWidth / imageHeight) * BASE_SIZE);
						dpImageElement.height = BASE_SIZE;
					}
				} else {
					dpImageElement.removeAttribute('width');
					dpImageElement.removeAttribute('height');
				}
			}

			const dpTitleElement = <HTMLElement>templateElementClone.querySelector('.js-title');
			dpTitleElement.insertAdjacentText('afterbegin', title);

			if (binding !== undefined) {
				const dpBindingElement = <HTMLElement>templateElementClone.querySelector('.js-binding');
				dpBindingElement.textContent = binding;
				dpBindingElement.hidden = false;
			}

			if (date !== undefined) {
				const year = date.getFullYear();
				const month = date.getMonth() + 1;
				const day = date.getDate();

				const dpDateElement = <HTMLElement>templateElementClone.querySelector(date.getTime() <= nowTime ? '.js-date-past' : '.js-date-future');

				const dpTimeElement = dpDateElement.getElementsByTagName('time')[0];
				if (dpTimeElement !== undefined) {
					dpTimeElement.dateTime = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
					dpTimeElement.textContent = year !== nowYear ? `${year}年${month}月${day}日` : `${month}月${day}日`;
				}

				dpDateElement.hidden = false;
			}

			fragment.appendChild(templateElementClone);
		}

		this.#templateElement.parentNode?.appendChild(fragment);
	}
}
