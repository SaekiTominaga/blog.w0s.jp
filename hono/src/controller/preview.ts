import { Hono } from 'hono';
import Markdown from '../markdown/Markdown.js';
import { json as validatorJson } from '../validator/preview.js';

/**
 * 本文プレビュー
 */

export const previewApp = new Hono().post(validatorJson, async (context) => {
	const { req } = context;

	const requestBody = req.valid('json');

	const markdown = new Markdown({ lint: true });
	const { value, messages } = await markdown.toHtml(requestBody.markdown);

	const responseJson: BlogApi.Preview = {
		html: value.toString(),
		messages: messages,
	};

	return context.json(responseJson);
});
