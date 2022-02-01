import Controller from '../../Controller.js';
import ControllerInterface from '../../ControllerInterface.js';
import MessageParser from '../../util/MessageParser.js';
import { NoName as ConfigureCommon } from '../../../configure/type/common';
import { Request, Response } from 'express';

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
		const markdown = <string | undefined>req.body.md;

		if (markdown === undefined) {
			this.logger.error(`パラメーター message が未設定: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}

		const messageParser = new MessageParser(this.#configCommon);

		const responseJson: BlogApi.Preview = {
			html: await messageParser.toHtml(markdown),
		};

		res.status(200).json(responseJson);
	}
}
