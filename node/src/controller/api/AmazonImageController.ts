// @ts-expect-error: ts(7016)
import amazonPaapi from 'amazon-paapi';
import BlogAmazonDao from '../../dao/BlogAmazonDao.js';
import Controller from '../../Controller.js';
import ControllerInterface from '../../ControllerInterface.js';
import fs from 'fs';
import { PAAPI as ConfigurePaapi } from '../../../configure/type/PAAPI.js';
import { GetItemsResponse } from 'paapi5-typescript-sdk';
import { Request, Response } from 'express';

/**
 * Amazon 商品画像取得
 */
export default class AmazonImageController extends Controller implements ControllerInterface {
	#configPaapi: ConfigurePaapi;

	constructor() {
		super();

		this.#configPaapi = <ConfigurePaapi>JSON.parse(fs.readFileSync('node/configure/PAAPI.json', 'utf8'));
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
		const asins: string | string[] | undefined = requestBody.asin;

		if (asins === undefined) {
			this.logger.error(`パラメーター asin が未設定: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}
		try {
			if (!(<string[]>asins).every((asin) => /^[\dA-Z]{10}$/.test(asin))) {
				this.logger.error(`パラメーター asin（${asins}）の値が不正: ${req.get('User-Agent')}`);
				res.status(403).end();
				return;
			}
		} catch (e) {
			this.logger.error(`パラメーター asin（${asins}）の型が不正: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}

		const dao = new BlogAmazonDao();

		const registeredImageUrls: Map<string, string> = new Map();
		for (const amazonData of await dao.getWithImage()) {
			registeredImageUrls.set(amazonData.asin, amazonData.image_url);
		}

		const registeredAsins = (<string[]>asins).filter((asin) => Array.from(registeredImageUrls.keys()).includes(asin)); // DB に登録済みの ASIN
		const unregisteredAsins = (<string[]>asins).filter((asin) => !Array.from(registeredImageUrls.keys()).includes(asin)); // DB に登録されていない ASIN

		const imageUrls: Map<string, string> = new Map();
		for (const asin of registeredAsins) {
			imageUrls.set(asin, <string>registeredImageUrls.get(asin));
		}

		this.logger.debug('imageUrls', imageUrls);
		this.logger.debug('unregisteredAsins', unregisteredAsins);

		const paapiErros: string[] = []; // PA-API でのエラー情報を格納

		if (unregisteredAsins.length >= 1) {
			const paapiResponse = <GetItemsResponse>await amazonPaapi.GetItems(
				{
					PartnerTag: this.#configPaapi.partner_tag,
					PartnerType: 'Associates',
					AccessKey: this.#configPaapi.access_key,
					SecretKey: this.#configPaapi.secret_key,
					Marketplace: this.#configPaapi.marketplace,
					Host: this.#configPaapi.host,
					Region: this.#configPaapi.region,
				},
				{
					ItemIds: unregisteredAsins,
					Resources: ['Images.Primary.Large', 'ItemInfo.Classifications', 'ItemInfo.ContentInfo', 'ItemInfo.Title'],
				}
			);
			const paapiResponseErrors = paapiResponse.Errors;
			if (paapiResponseErrors !== undefined) {
				for (const error of paapiResponseErrors) {
					paapiErros.push(`${error.Code} : ${error.Message}`);
				}
			}

			const amazonDataList: BlogDb.AmazonData[] = [];
			for (const item of paapiResponse.ItemsResult.Items) {
				this.logger.debug(item); // TODO:

				const itemInfo = item.ItemInfo;

				const publicationDateStr = itemInfo?.ContentInfo?.PublicationDate.DisplayValue;
				let publicationDate: Date | null = null;
				if (publicationDateStr !== undefined) {
					if (
						/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(publicationDateStr) /* 2000-01-01T00:00:00Z */ ||
						/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(publicationDateStr) /* 2000-01-01T00:00:00.000Z */ ||
						/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-\d{2}:\d{2}$/.test(publicationDateStr) /* 2000-01-01T00:00:00.000-00:00 */
					) {
						publicationDate = new Date(publicationDateStr);
					} else if (/^\d{4}-\d{2}-\d{2}T?$/.test(publicationDateStr) /* 2000-01-01 */) {
						publicationDate = new Date(
							Number(publicationDateStr.substring(0, 4)),
							Number(publicationDateStr.substring(5, 7)),
							Number(publicationDateStr.substring(8, 10))
						);
					} else if (/^\d{4}-\d{2}T?$/.test(publicationDateStr) /* 2000-01T */) {
						publicationDate = new Date(Number(publicationDateStr.substring(0, 4)), Number(publicationDateStr.substring(5, 7)));
					} else if (/^\d{4}T?$/.test(publicationDateStr) /* 2000T */) {
						publicationDate = new Date(Number(publicationDateStr.substring(0, 4)));
					} else {
						this.logger.warn(`想定外の日付フォーマット: ${publicationDateStr}`);
					}
				}

				const imagesPrimaryLarge = item.Images?.Primary?.Large;

				amazonDataList.push({
					asin: item.ASIN,
					url: item.DetailPageURL,
					title: <string>itemInfo?.Title?.DisplayValue,
					binding: itemInfo?.Classifications?.Binding.DisplayValue ?? null,
					product_group: itemInfo?.Classifications?.ProductGroup.DisplayValue ?? null,
					date: publicationDate,
					image_url: imagesPrimaryLarge?.URL ?? null,
					image_width: imagesPrimaryLarge !== undefined ? Number(imagesPrimaryLarge.Width) : null,
					image_height: imagesPrimaryLarge !== undefined ? Number(imagesPrimaryLarge.Height) : null,
					last_update: new Date(),
				});
			}

			dao.insert(amazonDataList);
		}

		const responseJson: BlogApi.AmazonImage = {
			errors: paapiErros,
			images: imageUrls,
		};

		res.status(200).json(responseJson);
	}
}
