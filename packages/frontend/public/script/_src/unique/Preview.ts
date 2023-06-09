/**
 * 本文プレビュー
 */
export default class Preview {
	readonly #ctrlElement: HTMLTextAreaElement; // 本文入力欄

	readonly #previewElement: HTMLElement; // プレビューを表示する要素

	/**
	 * @param {object} ctrlElement - 本文入力欄
	 * @param {object} previewElement - プレビューを表示する要素
	 */
	constructor(ctrlElement: HTMLTextAreaElement, previewElement: HTMLElement) {
		this.#ctrlElement = ctrlElement;
		this.#previewElement = previewElement;
	}

	/**
	 * 処理実行
	 */
	async exec(): Promise<void> {
		const formData = new FormData();
		formData.append('md', this.#ctrlElement.value);

		const response = await fetch('/api/preview', {
			method: 'POST',
			body: new URLSearchParams(<string[][]>[...formData]),
		});

		if (!response.ok) {
			this.#previewElement.textContent = `"${response.url}" is ${response.status} ${response.statusText}`;
		}
		const responseJson: {
			html: string;
			tweetExist: boolean;
		} = await response.json();

		this.#previewElement.innerHTML = responseJson.html;

		if (responseJson.tweetExist) {
			// @ts-expect-error: ts(2339)
			window.twttr.widgets.load(this.#previewElement); // https://developer.twitter.com/en/docs/twitter-for-websites/javascript-api/guides/scripting-loading-and-initialization
		}
	}
}
