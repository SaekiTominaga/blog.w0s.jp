import PaapiItemImageUrlParser from '@saekitominaga/paapi-item-image-url-parser';

/**
 * 記事を解析して画像情報を抜粋する
 */
export default class MessageImage {
	readonly #ctrlElement: HTMLTextAreaElement; // 本文入力欄

	readonly #selectImageElement: HTMLTemplateElement; // 選択画像を表示する要素

	readonly #selectImageErrorElement: HTMLTemplateElement; // エラー情報を表示する要素

	readonly #imageName: string | undefined; // 既存記事でもともと指定されていた画像（ファイル名 or 外部サービス URL）

	/**
	 * @param {object} ctrlElement - 本文入力欄
	 * @param {object} selectImageElement - 選択画像を表示する要素
	 * @param {object} selectImageErrorElement - エラー情報を表示する要素
	 */
	constructor(ctrlElement: HTMLTextAreaElement, selectImageElement: HTMLTemplateElement, selectImageErrorElement: HTMLTemplateElement) {
		this.#ctrlElement = ctrlElement;
		this.#selectImageElement = selectImageElement;
		this.#selectImageErrorElement = selectImageErrorElement;

		this.#imageName = selectImageElement.dataset['selected'];
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

		const tweetIds: Set<string> = new Set(); // Tweet ID
		const youtubeIds: Set<string> = new Set(); // YouTube ID
		const asins: Set<string> = new Set(); // ASIN

		/* 本文内のテキストから画像パスと ASIN を抜き出す */
		this.#ctrlElement.value.split('\n').forEach((line: string): void => {
			const firstCharactor = line.substring(0, 1); // 先頭文字
			switch (firstCharactor) {
				case '!': {
					if (line.startsWith('!youtube:')) {
						const youtubeMatchGroups = line.match(/^!youtube:(?<id>[-_a-zA-Z0-9]+) [^<>]+( <.+>)?$/)?.groups;
						if (youtubeMatchGroups !== undefined) {
							if (youtubeMatchGroups['id'] !== undefined) {
								youtubeIds.add(youtubeMatchGroups['id']);
							}
						}
					} else {
						const imageMatchGroups = line.match(/^!(?<filename>[^ ]+)/)?.groups;
						if (imageMatchGroups !== undefined) {
							if (imageMatchGroups['filename'] !== undefined) {
								imageNames.add(imageMatchGroups['filename']);
							}
						}
					}

					break;
				}
				case '$': {
					if (line.startsWith('$tweet: ')) {
						const twitterMatchGroups = line.match(/^\$tweet: (?<ids>[0-9][ 0-9]*)$/)?.groups;
						if (twitterMatchGroups !== undefined) {
							twitterMatchGroups['ids']?.split(' ').forEach((tweetId) => {
								tweetIds.add(tweetId);
							});
						}
					} else if (line.startsWith('$amazon: ')) {
						const asinMatchGroups = line.match(/^\$amazon: (?<asins>[0-9A-Z][ 0-9A-Z]*)$/)?.groups;
						if (asinMatchGroups !== undefined) {
							asinMatchGroups['asins']?.split(' ').forEach((asin) => {
								asins.add(asin);
							});
						}
					}

					break;
				}
				default:
			}
		});

		/* YouTube */
		for (const youtubeId of youtubeIds) {
			imageNames.add(`https://i1.ytimg.com/vi/${youtubeId}/hqdefault.jpg`);
		}

		/* Tweet */
		if (tweetIds.size >= 1) {
			const formData = new FormData();
			for (const tweetId of tweetIds) {
				formData.append('id[]', tweetId);
			}

			const response = await fetch('/api/tweet-media', {
				method: 'POST',
				body: new URLSearchParams(<string[][]>[...formData]),
			});
			try {
				if (!response.ok) {
					throw new Error(`"${response.url}" is ${response.status} ${response.statusText}`);
				}
				const responseJson: BlogApi.TweetMedia = await response.json();

				for (const mediaUrl of responseJson.media_urls) {
					imageNames.add(mediaUrl);
				}
			} catch (e) {
				errorMessages.add(e instanceof Error ? e.message : 'Tweet API Error');
			}
		}

		/* Amazon */
		if (asins.size >= 1) {
			const formData = new FormData();
			for (const asin of asins) {
				formData.append('asin[]', asin);
			}

			const response = await fetch('/api/amazon-image', {
				method: 'POST',
				body: new URLSearchParams(<string[][]>[...formData]),
			});
			try {
				if (!response.ok) {
					throw new Error(`"${response.url}" is ${response.status} ${response.statusText}`);
				}
				const responseJson: BlogApi.AmazonImage = await response.json();

				for (const imageUrl of responseJson.image_urls) {
					const paapiItemImageUrlParser = new PaapiItemImageUrlParser(new URL(imageUrl));
					paapiItemImageUrlParser.removeSize();
					imageNames.add(paapiItemImageUrlParser.toString());
				}
				for (const error of responseJson.errors) {
					errorMessages.add(error);
				}
			} catch (e) {
				errorMessages.add(e instanceof Error ? e.message : 'Amazon API Error');
			}
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