import PaapiItemImageUrlParser from '@saekitominaga/paapi-item-image-url-parser';

interface Option {
	ctrl: HTMLTextAreaElement;
	image: HTMLTemplateElement;
	error: HTMLTemplateElement;
}

/**
 * 記事を解析して画像情報を抜粋する
 */
export default class MessageImage {
	readonly #ctrlElement: HTMLTextAreaElement; // 本文入力欄

	readonly #selectImageElement: HTMLTemplateElement; // 選択画像を表示する要素

	readonly #selectImageErrorElement: HTMLTemplateElement; // エラー情報を表示する要素

	readonly #imageName: string | undefined; // 既存記事でもともと指定されていた画像（ファイル名 or 外部サービス URL）

	/**
	 * @param {object} options - Option
	 */
	constructor(options: Option) {
		this.#ctrlElement = options.ctrl;
		this.#selectImageElement = options.image;
		this.#selectImageErrorElement = options.error;

		this.#imageName = options.image.dataset['selected'];
	}

	/**
	 * 処理実行
	 */
	async exec(): Promise<void> {
		let selectedImageName: string | undefined;

		/* いったんクリア */
		while (this.#selectImageElement.nextElementSibling) {
			const radioCheckedElements = this.#selectImageElement.nextElementSibling.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked');
			if (radioCheckedElements.length === 1) {
				selectedImageName = radioCheckedElements[0]?.value;
			}
			this.#selectImageElement.nextElementSibling.remove();
		}
		while (this.#selectImageErrorElement.nextElementSibling) {
			this.#selectImageErrorElement.nextElementSibling.remove();
		}

		const imageNames: Set<string> = new Set(); // 画像ファイル名 or 外部サービス URL
		const errorMessages: Set<string> = new Set(); // エラーメッセージ

		const youtubeIds: Set<string> = new Set(); // YouTube ID
		const amazonImageIds: Set<string> = new Set(); // Amazon 画像 ID

		/* 本文内のテキストから画像パスと ASIN を抜き出す */
		this.#ctrlElement.value.split('\n').forEach((line: string): void => {
			const EMBEDDED_START = '@';
			const SERVICE_AMAZON = 'amazon';
			const SERVICE_YOUTUBE = 'youtube';
			const NAME_META_SEPARATOR = ': ';
			const META_SEPARATOR = ' ';
			const OPTION_OPEN = ' <';
			const OPTION_CLOSE = '>';

			if (!line.startsWith(EMBEDDED_START)) {
				return;
			}

			const nameMetaSeparatorIndex = line.indexOf(NAME_META_SEPARATOR);
			if (nameMetaSeparatorIndex === -1) {
				return;
			}

			const name = line.substring(EMBEDDED_START.length, nameMetaSeparatorIndex);
			const meta = line.substring(nameMetaSeparatorIndex + NAME_META_SEPARATOR.length);

			const optionOpenIndex = meta.lastIndexOf(OPTION_OPEN);
			const optionCloseIndex = meta.lastIndexOf(OPTION_CLOSE);

			let require = meta;
			let option: string | undefined;
			if (optionOpenIndex !== -1 && optionCloseIndex === meta.length - OPTION_CLOSE.length) {
				require = meta.substring(0, optionOpenIndex);
				option = meta.substring(optionOpenIndex + OPTION_OPEN.length, meta.length - OPTION_CLOSE.length);
			}

			if (name.includes('.')) {
				imageNames.add(name);
			} else {
				switch (name) {
					case SERVICE_AMAZON: {
						option?.split(META_SEPARATOR).forEach((fragment) => {
							if (/^[a-zA-Z0-9-_+%]+$/.test(fragment)) {
								/* 画像ID */
								amazonImageIds.add(fragment);
							}
						});
						break;
					}
					case SERVICE_YOUTUBE: {
						const requireSeparator1Index = require.indexOf(META_SEPARATOR);
						const id = require.substring(0, requireSeparator1Index);

						youtubeIds.add(id);
						break;
					}
					default:
				}
			}
		});

		/* YouTube */
		for (const youtubeId of youtubeIds) {
			imageNames.add(`https://i1.ytimg.com/vi/${youtubeId}/hqdefault.jpg`);
		}

		/* Amazon */
		if (amazonImageIds.size >= 1) {
			amazonImageIds.forEach((imageId) => {
				const paapiItemImageUrlParser = new PaapiItemImageUrlParser(new URL(`https://m.media-amazon.com/images/I/${imageId}.jpg`));
				paapiItemImageUrlParser.removeSize();
				imageNames.add(paapiItemImageUrlParser.toString());
			});
		}

		this.#displayRadioButtons(imageNames, selectedImageName);
		this.#displayErrorMessages(errorMessages);
	}

	/**
	 * 画像を選択するラジオボタンを表示する
	 *
	 * @param {Set} imageNames - 画像ファイル名 or 外部サービス URL
	 * @param {string} selectedImageName - ラジオボタンで選択された値（画像ファイル名 or 外部サービス URL）
	 */
	#displayRadioButtons(imageNames: Set<string>, selectedImageName?: string): void {
		const fragment = document.createDocumentFragment();
		for (const imageName of imageNames) {
			const templateElementClone = this.#selectImageElement.content.cloneNode(true) as HTMLElement;

			const radioElement = <HTMLInputElement>templateElementClone.querySelector('input[type="radio"]');
			radioElement.value = imageName;
			if (selectedImageName !== undefined) {
				if (imageName === selectedImageName) {
					radioElement.checked = true;
				}
			} else if (imageName === this.#imageName) {
				radioElement.checked = true;
			}

			const imgElement = <HTMLImageElement>templateElementClone.querySelector('img');
			if (imageName.search('https?://') === 0) {
				imgElement.src = imageName;
			} else {
				imgElement.src = `https://media.w0s.jp/thumbimage/blog/${imageName}?type=webp;w=360;h=360;quality=30`;
			}
			imgElement.alt = imageName;
			imgElement.title = imageName;

			fragment.appendChild(templateElementClone);
		}
		this.#selectImageElement.parentNode?.appendChild(fragment);
	}

	/**
	 * エラーメッセージを表示する
	 *
	 * @param {Set} messages - エラーメッセージ
	 */
	#displayErrorMessages(messages: Set<string>): void {
		const fragment = document.createDocumentFragment();
		for (const message of messages) {
			const templateElementClone = this.#selectImageErrorElement.content.cloneNode(true) as HTMLElement;

			const liElement = <HTMLLIElement>templateElementClone.querySelector('li');
			liElement.textContent = message;

			fragment.appendChild(templateElementClone);
		}
		this.#selectImageErrorElement.parentNode?.appendChild(fragment);
	}
}
