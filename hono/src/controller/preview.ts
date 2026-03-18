import { Hono } from 'hono';
import type { Variables } from '../app.ts';
import { json as validatorJson } from '../validator/preview.ts';
import type { Preview } from '../../../@types/api.d.ts';
import Markdown from '../../../remark/dist/Markdown.js';

/**
 * 本文プレビュー
 */

export const previewApp = new Hono<{ Variables: Variables }>().post(validatorJson, async (context) => {
	const { req } = context;

	const requestBody = req.valid('json');

	const markdown = new Markdown({ lint: true });
	const { value, messages } = await markdown.toHtml(requestBody.markdown);

	const responseJson: Preview = {
		html: value.toString(),
		messages: messages,
	};

	return context.json(responseJson);
});
