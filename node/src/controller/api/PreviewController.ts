import fs from 'node:fs';
import { Request, Response } from 'express';
import Controller from '../../Controller.js';
import ControllerInterface from '../../ControllerInterface.js';
import MessageParser from '../../util/MessageParser.js';
import { NoName as ConfigureCommon } from '../../../configure/type/common.js';
import { NoName as ConfigureMessage } from '../../../configure/type/message.js';
import RequestUtil from '../../util/RequestUtil.js';

/**
 * 本文プレビュー
 */
export default class PreviewController extends Controller implements ControllerInterface {
	#configureMessage: ConfigureMessage;

	/**
	 * @param {ConfigureCommon} configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super(configCommon);

		this.#configureMessage = JSON.parse(fs.readFileSync('node/configure/message.json', 'utf8'));
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const requestQuery: BlogRequest.ApiPreview = {
			markdown: RequestUtil.string(req.body['md']),
		};

		if (requestQuery.markdown === null) {
			this.logger.error(`パラメーター message が未設定: ${req.get('User-Agent')}`);
			res.status(403).end();
			return;
		}

		const messageParser = new MessageParser(this.configCommon, {
			anchor_host_icons: this.#configureMessage.anchor_host_icon,
		});

		const responseJson: BlogApi.Preview = {
			html: await messageParser.toHtml(requestQuery.markdown),
		};

		res.status(200).json(responseJson);
	}
}
