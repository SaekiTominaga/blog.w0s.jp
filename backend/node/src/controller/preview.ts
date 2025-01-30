import type { Request, Response } from 'express';
import Log4js from 'log4js';
import Markdown from '../markdown/Markdown.js';

const logger = Log4js.getLogger('preview');

/**
 * 本文プレビュー
 *
 * @param req - Request
 * @param res - Response
 */
const execute = async (req: Request, res: Response): Promise<void> => {
	const requestQuery: BlogRequest.ApiPreview = {
		markdown: (req.body['md'] as string | undefined) ?? null,
	};

	if (requestQuery.markdown === null) {
		logger.error('パラメーター message が未設定');
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
};

export default execute;
