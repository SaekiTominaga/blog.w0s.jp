import BlogDao from '../dao/BlogDao.js';
import Controller from '../Controller.js';
import ControllerInterface from '../ControllerInterface.js';
import HttpResponse from '../util/HttpResponse.js';
import MessageParser from '../util/MessageParser.js';
import { Request } from 'express';

/**
 * 本文プレビュー
 */
export default class MessagePreviewController extends Controller implements ControllerInterface {
	/**
	 * @param {Request} req - Request
	 * @param {HttpResponse} response - HttpResponse
	 */
	async execute(req: Request, response: HttpResponse): Promise<void> {
		const requestBody = req.body;
		const message: string | undefined = requestBody.message;

		if (message === undefined) {
			this.logger.error(`パラメーター message（${message}）が未設定: ${req.get('User-Agent')}`);
			response.send403();
			return;
		}

		const messageParser = new MessageParser(new BlogDao());

		response.render('message-preview', {
			message: await messageParser.toHtml(message),

			tweet: messageParser.isTweetExit,
		});
	}
}
