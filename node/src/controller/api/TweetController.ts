import BlogTweetDao from '../../dao/BlogTweetDao.js';
import Controller from '../../Controller.js';
import ControllerInterface from '../../ControllerInterface.js';
import fs from 'fs';
import Twitter from 'twitter-v2';
import { TwitterAPI as ConfigureTwitter } from '../../../configure/type/twitter.js';
import { Request, Response } from 'express';

interface Tweet {
	text: string;
	author_id: string;
	created_at: string;
	id: string;
}

interface Media {
	media_key: string;
	type: string;
	url?: string;
	preview_image_url?: string;
}

interface User {
	id: string;
	name: string;
	username: string;
}

/**
 * ツイート情報取得
 */
export default class TweetController extends Controller implements ControllerInterface {
	#configTwitter: ConfigureTwitter;

	constructor() {
		super();

		this.#configTwitter = <ConfigureTwitter>JSON.parse(fs.readFileSync('node/configure/twitter.json', 'utf8'));
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

		const { data, includes } = await twitter.get('tweets', {
			expansions: 'attachments.media_keys,author_id',
			ids: (<string[]>ids).join(','), // TODO: 最大100件の考慮は未実装 https://developer.twitter.com/en/docs/twitter-api/tweets/lookup/api-reference/get-tweets
			media: {
				fields: 'preview_image_url,type,url',
			},
			tweet: {
				fields: 'created_at',
			},
		});

		const dao = new BlogTweetDao();
		const registeredTweetIds = await dao.getAllTweetIds();

		if (data !== undefined) {
			const tweetIdList: string[] = [];
			const tweetDataList: BlogDb.TweetData[] = [];

			for (const tweet of <Tweet[]>data) {
				const tweetId = tweet.id;

				if (registeredTweetIds.includes(tweetId)) {
					this.logger.debug(`DB 登録済み: ${tweetId}`);
					continue;
				}

				const user = (<User[]>includes.users).find((user: User) => user.id === tweet.author_id);
				if (user === undefined) {
					this.logger.error(`API から取得したユーザー情報が不整合: ${tweetId}`);
					continue;
				}

				tweetIdList.push(tweetId);
				tweetDataList.push({
					id: tweetId,
					name: user.name,
					username: user.username,
					text: tweet.text,
					created_at: new Date(tweet.created_at),
				});
			}

			if (tweetDataList.length > 0) {
				this.logger.info('ツイート情報を DB に登録', tweetIdList);
				dao.insert(tweetDataList);
			}
		}

		const imageUrls: BlogApi.TweetImage = [];
		if (includes?.media !== undefined) {
			for (const media of <Media[]>includes.media) {
				if (media.url !== undefined) {
					imageUrls.push(media.url);
				} else if (media.preview_image_url !== undefined) {
					imageUrls.push(media.preview_image_url);
				}
			}
		}

		res.status(200).json({ image_urls: imageUrls });
	}
}
