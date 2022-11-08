import { Request, Response } from 'express';
import Controller from '../../Controller.js';
import ControllerInterface from '../../ControllerInterface.js';
import MessageParser from '../../util/MessageParser.js';
import { NoName as ConfigureCommon } from '../../../configure/type/common.js';
import RequestUtil from '../../util/RequestUtil.js';

/**
 * 本文プレビュー
 */
export default class PreviewController extends Controller implements ControllerInterface {
	#configCommon: ConfigureCommon;

	/**
	 * @param {ConfigureCommon} configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super();

		this.#configCommon = configCommon;
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const requestQuery: BlogRequest.ApiPreview = {
			markdown: RequestUtil.string(req.body.md),
		};

		if (requestQuery.markdown === null) {
			this.logger.error(`パラメーター message が未設定: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}

		const messageParser = new MessageParser(this.#configCommon);

		const responseJson: BlogApi.Preview = {
			html: await messageParser.toHtml(requestQuery.markdown),
		};

		res.status(200).json(responseJson);
	}
}
