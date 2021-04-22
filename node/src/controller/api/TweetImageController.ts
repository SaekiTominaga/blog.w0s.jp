import Controller from '../../Controller.js';
import ControllerInterface from '../../ControllerInterface.js';
import fs from 'fs';
import Twitter from 'twitter-v2';
import { TwitterAPI as ConfigureTwitter } from '../../../configure/type/Twitter.js';
import { Request, Response } from 'express';

/**
 * ツイート画像取得
 */
export default class TweetImageController extends Controller implements ControllerInterface {
	#configTwitter: ConfigureTwitter;

	constructor() {
		super();

		this.#configTwitter = <ConfigureTwitter>JSON.parse(fs.readFileSync('node/configure/Twitter.json', 'utf8'));
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		if (res.get('Access-Control-Allow-Origin') === undefined) {
			this.logger.error(`Access-Control-Allow-Origin ヘッダが存在しない: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}

		const requestBody = req.body;
		const ids: string | string[] | undefined = requestBody.id;

		if (ids === undefined) {
			this.logger.error(`パラメーター id が未設定: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}
		try {
			if (!(<string[]>ids).every((id) => /^[0-9]+$/.test(id))) {
				this.logger.error(`パラメーター id（${ids}）の値が不正: ${req.get('User-Agent')}`);
				res.status(403).end();
				return;
			}
		} catch (e) {
			this.logger.error(`パラメーター ID（${ids}）の型が不正: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}

		const twitter = new Twitter({
			consumer_key: this.#configTwitter.production.consumer_key,
			consumer_secret: this.#configTwitter.production.consumer_secret,
			access_token_key: '',
			access_token_secret: '',
		});

		const { includes } = await twitter.get('tweets', {
			expansions: 'attachments.media_keys',
			ids: (<string[]>ids).join(','), // TODO: 最大100件の考慮は未実装 https://developer.twitter.com/en/docs/twitter-api/tweets/lookup/api-reference/get-tweets
			media: {
				fields: 'preview_image_url,type,url',
			},
		});

		const imageUrls: BlogApi.TweetImage = [];

		if (includes !== undefined) {
			for (const media of includes.media) {
				if (media.url !== undefined) {
					imageUrls.push(media.url);
				} else if (media.preview_image_url !== undefined) {
					imageUrls.push(media.preview_image_url);
				}
			}
		}

		this.logger.debug(imageUrls);

		res.status(200).json(imageUrls);
	}
}
