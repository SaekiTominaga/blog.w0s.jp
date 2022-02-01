import Twitter from 'twitter';
import TwitterText from 'twitter-text';

export default class Tweet {
	#twitter: Twitter;

	/* 画像の添付最大数 */
	readonly #IMAGE_LIMIT = 4;
	/* API のアクセス取得間隔（ミリ秒） */
	readonly #ACCESS_INTERVAL = 1000;
	/* 最大文字数超過時の本文末尾に追加する文字列 */
	readonly #POST_MARKER = '...';

	/* APIリクエスト回数 */
	#requestCount = 0;

	constructor(twitter: Twitter) {
		this.#twitter = twitter;
	}

	/**
	 * 投稿する
	 *
	 * @param {string} text - 本文
	 * @param {string} url - URL
	 * @param {string} hashtag - ハッシュタグ
	 * @param {Set} medias - 添付するメディア
	 *
	 * @returns {Twitter.ResponseData} ResponseData
	 */
	async postMessage(text: string, url?: string, hashtag?: string, medias?: Set<Buffer>): Promise<Twitter.ResponseData> {
		const requestParams: Twitter.RequestParams = {};

		/* 本文を組み立てる */
		let postText = text;
		let postMessage = this.assembleTweetMessage(postText, url, hashtag);

		while (!TwitterText.parseTweet(postMessage).valid) {
			postText = postText.substring(0, postText.length - 1);
			postMessage = this.assembleTweetMessage(postText, url, hashtag, this.#POST_MARKER);

			if (postText.length === 0) {
				throw new Error('The tweet will fail even if the length of the body is shortened to 0 characters.');
			}
		}

		requestParams.status = postMessage;

		/* メディアをアップロードする */
		if (medias !== undefined) {
			if (medias.size > this.#IMAGE_LIMIT) {
				throw new RangeError(`There should be no more than ${this.#IMAGE_LIMIT} media attachments.`);
			}

			const mediaIds = new Set<string>();
			for (const media of medias) {
				mediaIds.add(await this.uploadMedia(media));
			}

			requestParams.media_ids = Array.from(mediaIds).join(',');
		}

		await this.apiConnectPreprocessing();

		const response = await this.#twitter.post('statuses/update', requestParams); // https://developer.twitter.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update

		if (response.text === undefined) {
			throw new Error(`Tweet failure. ${response.toString()}`);
		}

		return response;
	}

	/**
	 * メディアをアップロードする
	 *
	 * @param {object} media - アップロードするメディア
	 *
	 * @returns {string} media_id
	 */
	async uploadMedia(media: Buffer): Promise<string> {
		await this.apiConnectPreprocessing();

		const response = await this.#twitter.post('media/upload', {
			media: media,
		}); // https://developer.twitter.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-upload

		if (response.media_id_string === undefined) {
			throw new Error(`Media upload failure. ${response.toString()}`);
		}

		return response.media_id_string;
	}

	/**
	 * API 接続前に行う処理
	 */
	private async apiConnectPreprocessing(): Promise<void> {
		if (this.#requestCount > 0) {
			/* 初回リクエスト時以外は一定間隔を空けてアクセス */
			await new Promise((resolve) => setTimeout(resolve, this.#ACCESS_INTERVAL));
		}
		this.#requestCount++;
	}

	/**
	 * ツイートメッセージを組み立てる
	 *
	 * @param {string} text - 本文
	 * @param {string} url - URL
	 * @param {string} hashtag - ハッシュタグ
	 * @param {string} trimMaker - 最大文字数超過時の本文末尾に追加する文字列
	 *
	 * @returns {string} 組み立てたメッセージ
	 */
	private assembleTweetMessage(text: string, url?: string, hashtag?: string, trimMaker?: string): string {
		let message = text;
		if (trimMaker !== undefined && trimMaker !== '') {
			message += trimMaker;
		}
		if (hashtag !== undefined && hashtag !== '') {
			message += ` ${hashtag}`;
		}
		if (url !== undefined && url !== '') {
			message += `\n${url}`;
		}

		return message;
	}
}
