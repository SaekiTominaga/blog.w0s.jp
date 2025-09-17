import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';

interface Option {
	preview: HTMLTemplateElement;
	image: HTMLTemplateElement;
}

/**
 * 記事を解析して画像情報を抜粋する
 */
export default class MessageImage {
	readonly #previewElement: HTMLTemplateElement; // 本文プレビューを表示する要素

	readonly #selectImageElement: HTMLTemplateElement; // 選択画像を表示する要素

	readonly #imageName: string | undefined; // 既存記事でもともと指定されていた画像（ファイル名 or 外部サービス URL）

	/**
	 * @param options - Option
	 */
	constructor(options: Option) {
		this.#previewElement = options.preview;
		this.#selectImageElement = options.image;

		this.#imageName = options.image.dataset['selected'];
	}

	/**
	 * 処理実行
	 */
	exec(): void {
		let selectedImageName: string | undefined;

		/* いったんクリア */
		while (this.#selectImageElement.nextElementSibling !== null) {
			const radioCheckedElements = this.#selectImageElement.nextElementSibling.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked');
			if (radioCheckedElements.length === 1) {
				selectedImageName = radioCheckedElements[0]?.value;
			}
			this.#selectImageElement.nextElementSibling.remove();
		}

		/* 本文内のテキストから画像パスと ASIN を抜き出す */
		const preview = this.#previewElement.nextElementSibling;
		if (preview === null) {
			return;
		}

		const imageFileNames = [
			...preview.querySelectorAll<HTMLAnchorElement>('.p-embed + .c-caption > .c-caption__media-expansion[href^="https://media.w0s.jp/image/blog/"]'),
		].map((element) => element.href.substring('https://media.w0s.jp/image/blog/'.length));
		const youtubeImageUrls = [...preview.querySelectorAll<HTMLAnchorElement>('.c-caption a[href^="https://www.youtube.com/watch?v="]')].map(
			(element) => `https://i1.ytimg.com/vi/${new URL(element.href).searchParams.get('v') ?? ''}/hqdefault.jpg`,
		);
		const amazonImageUrls = [...preview.querySelectorAll<HTMLImageElement>('img.p-amazon__image')].map((element) => {
			const paapiItemImageUrlParser = new PaapiItemImageUrlParser(new URL(element.src));
			paapiItemImageUrlParser.removeSize();
			return paapiItemImageUrlParser.toString();
		});

		const images = new Set<string>([...imageFileNames, ...youtubeImageUrls, ...amazonImageUrls]);

		this.#displayRadioButtons(images, selectedImageName);
	}

	/**
	 * 画像を選択するラジオボタンを表示する
	 *
	 * @param imageNames - 画像ファイル名 or 外部サービス URL
	 * @param selectedImageName - ラジオボタンで選択された値（画像ファイル名 or 外部サービス URL）
	 */
	#displayRadioButtons(imageNames: Set<string>, selectedImageName?: string): void {
		const fragment = document.createDocumentFragment();
		for (const imageName of imageNames) {
			const templateElementClone = this.#selectImageElement.content.cloneNode(true) as HTMLElement;

			const radioElement = templateElementClone.querySelector<HTMLInputElement>('input[type="radio"]');
			if (radioElement !== null) {
				radioElement.value = imageName;
				if (selectedImageName !== undefined) {
					if (imageName === selectedImageName) {
						radioElement.checked = true;
					}
				} else if (imageName === this.#imageName) {
					radioElement.checked = true;
				}
			}

			const imgElement = templateElementClone.querySelector('img');
			if (imgElement !== null) {
				if (imageName.search('https?://') === 0) {
					imgElement.src = imageName;
				} else {
					imgElement.src = `https://media.w0s.jp/thumbimage/blog/${imageName}?type=webp;w=360;h=360;quality=30`;
				}
				imgElement.alt = imageName;
				imgElement.title = imageName;
			}

			fragment.appendChild(templateElementClone);
		}
		this.#selectImageElement.parentNode?.appendChild(fragment);
	}
}
