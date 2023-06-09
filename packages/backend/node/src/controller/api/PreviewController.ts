import { Request, Response } from 'express';
import Controller from '../../Controller.js';
import ControllerInterface from '../../ControllerInterface.js';
import Markdown from '../../markdown/Markdown.js';
import RequestUtil from '../../util/RequestUtil.js';

/**
 * 本文プレビュー
 */
export default class PreviewController extends Controller implements ControllerInterface {
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

		const markdown = new Markdown({
			config: this.configCommon,
		});

		const responseJson: BlogApi.Preview = {
			html: await markdown.toHtml(requestQuery.markdown),
			tweetExist: markdown.isTweetExit(),
		};

		res.status(200).json(responseJson);
	}
}
