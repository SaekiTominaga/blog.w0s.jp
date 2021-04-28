import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import HttpResponse from '../util/HttpResponse.js';
import MessageParser from '../util/MessageParser.js';
import { NoName as ConfigureCommon } from '../../configure/type/common.js';
import { Request, Response } from 'express';

/**
 * 本文プレビュー
 */
export default class MessagePreviewController extends Controller implements ControllerInterface {
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
		const requestBody = req.body;
		const message: string | undefined = requestBody.message;

		const httpResponse = new HttpResponse(res, this.#configCommon);

		if (message === undefined) {
			this.logger.error(`パラメーター message（${message}）が未設定: ${req.get('User-Agent')}`);
			httpResponse.send403();
			return;
		}

		const messageParser = new MessageParser();

		res.render('message-preview', {
			message: await messageParser.toHtml(message),

			tweet: messageParser.isTweetExit,
		});
	}
}
