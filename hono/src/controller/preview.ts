import { Hono } from 'hono';
// eslint-disable-next-line import/extensions
import Markdown from '@blog.w0s.jp/remark/dist/Markdown.js';
import { json as validatorJson } from '../validator/preview.ts';

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
