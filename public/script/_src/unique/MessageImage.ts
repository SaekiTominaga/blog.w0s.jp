/**
 * 記事を解析して画像情報を抜粋する
 */
export default class {
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

		this.#imageName = selectImageElement.dataset.selected;
	}

	/**
	 * 処理実行
	 */
	async exec(): Promise<void> {
		let selectedImageName: string | undefined;

		/* いったんクリア */
		while (this.#selectImageElement.nextElementSibling) {
			const radioCheckedElements = <NodeListOf<HTMLInputElement>>this.#selectImageElement.nextElementSibling.querySelectorAll('input[type="radio"]:checked');
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
		this.#ctrlElement.value.split('\n').forEach((value: string): void => {
			const imageRegResult = /^!([^ ]+) (.+)/.exec(value);
			if (imageRegResult !== null) {
				imageNames.add(<string>imageRegResult[1]);
			}

			const twitterRegResult = /^\$tweet: ([ 0-9]+)/.exec(value);
			if (twitterRegResult !== null) {
				(<string>twitterRegResult[1]).split(' ').forEach((tweetId) => {
					tweetIds.add(tweetId);
				});
			}

			const youtubeRegResult = /^\$youtube: ([^ ]+) ([0-9]+)x([0-9]+) (.+)/.exec(value);
			if (youtubeRegResult !== null) {
				youtubeIds.add(<string>youtubeRegResult[1]);
			}

			const asinRegResult = /^\$amazon: ([ 0-9A-Z]+)/.exec(value);
			if (asinRegResult !== null) {
				(<string>asinRegResult[1]).split(' ').forEach((asin) => {
					asins.add(asin);
				});
			}
		});

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

		/* YouTube */
		for (const youtubeId of youtubeIds) {
			imageNames.add(`https://i1.ytimg.com/vi/${youtubeId}/hqdefault.jpg`);
			imageNames.add(`https://i1.ytimg.com/vi/${youtubeId}/1.jpg`);
			imageNames.add(`https://i1.ytimg.com/vi/${youtubeId}/2.jpg`);
			imageNames.add(`https://i1.ytimg.com/vi/${youtubeId}/3.jpg`);
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
					imageNames.add(imageUrl);
				}
				for (const error of responseJson.errors) {
					errorMessages.add(error);
				}
			} catch (e) {
				errorMessages.add(e instanceof Error ? e.message : 'Amazon API Error');
			}
		}

		console.debug(imageNames);
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
			const templateElementClone = <HTMLElement>this.#selectImageElement.content.cloneNode(true);

			const radioElement = <HTMLInputElement>templateElementClone.querySelector('input[type="radio"]');
			radioElement.value = imageName;
			if (selectedImageName !== undefined) {
				if (imageName === selectedImageName) {
					radioElement.checked = true;
				}
			} else {
				if (imageName === this.#imageName) {
					radioElement.checked = true;
				}
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
			const templateElementClone = <HTMLElement>this.#selectImageErrorElement.content.cloneNode(true);

			const liElement = <HTMLLIElement>templateElementClone.querySelector('li');
			liElement.textContent = message;

			fragment.appendChild(templateElementClone);
		}
		this.#selectImageErrorElement.parentNode?.appendChild(fragment);
	}
}
