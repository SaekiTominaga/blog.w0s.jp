import type { Request, Response } from 'express';
import Controller from '../../Controller.js';
import type ControllerInterface from '../../ControllerInterface.js';
import Markdown from '../../markdown/Markdown.js';

/**
 * 本文プレビュー
 */
export default class PreviewController extends Controller implements ControllerInterface {
	/**
	 * @param req - Request
	 * @param res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const requestQuery: BlogRequest.ApiPreview = {
			markdown: (req.body['md'] as string | undefined) ?? null,
		};

		if (requestQuery.markdown === null) {
			this.logger.error('パラメーター message が未設定');
			res.status(403).end();
			return;
		}

		const markdown = new Markdown({ lint: true });
		const { value, messages } = await markdown.toHtml(requestQuery.markdown);

		const responseJson: BlogApi.Preview = {
			html: value.toString(),
			messages: messages,
		};

		res.status(200).json(responseJson);
	}
}
