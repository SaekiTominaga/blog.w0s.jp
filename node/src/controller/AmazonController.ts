import dayjs from 'dayjs';
import fs from 'fs';
import PaapiItemImageUrlParser from '@saekitominaga/paapi-item-image-url-parser';
import { Request, Response } from 'express';
import BlogAmazonDao from '../dao/BlogAmazonDao.js';
import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import HttpResponse from '../util/HttpResponse.js';
import RequestUtil from '../util/RequestUtil.js';
import { Amazon as Configure } from '../../configure/type/amazon.js';
import { NoName as ConfigureCommon } from '../../configure/type/common.js';

/**
 * Amazon 商品管理
 */
export default class BlogAmazonController extends Controller implements ControllerInterface {
	#config: Configure;

	/**
	 * @param {ConfigureCommon} configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super(configCommon);

		this.#config = JSON.parse(fs.readFileSync('node/configure/amazon.json', 'utf8'));
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const httpResponse = new HttpResponse(req, res, this.configCommon);

		const requestQuery: BlogRequest.Amazon = {
			asin: RequestUtil.string(req.body['asin']),
			action_delete: RequestUtil.boolean(req.body['actiondel']),
		};

		const dao = new BlogAmazonDao(this.configCommon);

		if (requestQuery.action_delete) {
			/* 削除 */
			const { asin } = requestQuery;

			if (asin === null) {
				this.logger.warn('データ削除時に必要なパラメーターが指定されていない');
				httpResponse.send403();
				return;
			}

			await dao.delete(asin);
			this.logger.info(`${asin} を削除`);

			httpResponse.send303();
			return;
		}

		/* 初期表示 */
		const dpList = await dao.getDpsOrderByPublicationDate(); // 商品情報

		const dpListView: BlogView.AmazonDp[] = [];
		await Promise.all(
			dpList.map(async (dp) => {
				let imageUrl = null;
				if (dp.image_url !== null) {
					const paapiItemImageUrlParser = new PaapiItemImageUrlParser(new URL(dp.image_url));
					paapiItemImageUrlParser.setSize(72);
					imageUrl = paapiItemImageUrlParser.toString();
				}

				dpListView.push({
					asin: dp.asin,
					title: dp.title,
					binding: dp.binding,
					product_group: dp.product_group,
					publication_date: dp.publication_date !== null ? dayjs(dp.publication_date) : null,
					image_url: imageUrl,
					image_width: dp.image_width,
					image_height: dp.image_height,
					entry_ids: await dao.getEntryIds(dp.asin),
				});
			})
		);

		/* レンダリング */
		res.setHeader('Content-Security-Policy', this.configCommon.response.header.csp_html);
		res.setHeader('Content-Security-Policy-Report-Only', this.configCommon.response.header.cspro_html);
		res.render(this.#config.view.init, {
			pagePathAbsoluteUrl: req.path, // U+002F (/) から始まるパス絶対 URL
			requestQuery: requestQuery,
			dpList: dpListView, // 商品情報
		});
	}
}
