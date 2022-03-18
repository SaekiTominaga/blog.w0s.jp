import BlogTweetDao from '../../dao/BlogTweetDao.js';
import Controller from '../../Controller.js';
import ControllerInterface from '../../ControllerInterface.js';
import fs from 'fs';
import RequestUtil from '../../util/RequestUtil.js';
import { NoName as ConfigureCommon } from '../../../configure/type/common';
import { Request, Response } from 'express';
import { TwitterAPI as ConfigureTwitter } from '../../../configure/type/twitter.js';
import { TwitterApi } from 'twitter-api-v2';

/**
 * ツイート情報取得
 */
export default class TweetMediaController extends Controller implements ControllerInterface {
	#configCommon: ConfigureCommon;
	#configTwitter: ConfigureTwitter;

	/**
	 * @param {ConfigureCommon} configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super();

		this.#configCommon = configCommon;
		this.#configTwitter = <ConfigureTwitter>JSON.parse(fs.readFileSync('node/configure/twitter.json', 'utf8'));
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const requestQuery: BlogRequest.ApiTweetMedia = {
			id: RequestUtil.strings(req.body.id),
		};

		if (requestQuery.id.length === 0) {
			this.logger.error(`パラメーター id が未設定: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}
		try {
			if (!requestQuery.id.every((id) => /^[0-9]+$/.test(id))) {
				this.logger.error(`パラメーター id（${requestQuery.id}）の値が不正: ${req.get('User-Agent')}`);
				res.status(403).end();
				return;
			}
		} catch (e) {
			this.logger.error(`パラメーター ID（${requestQuery.id}）の型が不正: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}

		const twitterApi = new TwitterApi(this.#configTwitter.production.bearer_token);
		const twitterApiReadOnly = twitterApi.readOnly.v2;

		const { data, includes } = await twitterApiReadOnly.tweets(
			requestQuery.id /* TODO: 最大100件の考慮は未実装 https://developer.twitter.com/en/docs/twitter-api/tweets/lookup/api-reference/get-tweets */,
			{
				expansions: ['attachments.media_keys', 'author_id'],
				'media.fields': ['preview_image_url', 'type', 'url'],
				'tweet.fields': ['created_at'],
			}
		);

		const dao = new BlogTweetDao(this.#configCommon);
		const registeredTweetIds = await dao.getAllTweetIds();

		if (data !== undefined) {
			const tweetIdList: string[] = [];
			const tweetDataList: BlogDb.TweetData[] = [];

			for (const tweet of data) {
				const tweetId = tweet.id;

				if (registeredTweetIds.includes(tweetId)) {
					this.logger.debug(`DB 登録済み: ${tweetId}`);
					continue;
				}

				const user = includes?.users?.find((user) => user.id === tweet.author_id);
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
					created_at: new Date(tweet.created_at ?? 0),
				});
			}

			if (tweetDataList.length > 0) {
				this.logger.info('ツイート情報を DB に登録', tweetIdList);
				await dao.insert(tweetDataList);
			}
		}

		const mediaUrls: string[] = [];
		if (includes?.media !== undefined) {
			for (const media of includes.media) {
				if (media.url !== undefined) {
					mediaUrls.push(media.url);
				} else if (media.preview_image_url !== undefined) {
					mediaUrls.push(media.preview_image_url);
				}
			}
		}

		const responseJson: BlogApi.TweetMedia = {
			media_urls: mediaUrls,
		};

		res.status(200).json(responseJson);
	}
}
