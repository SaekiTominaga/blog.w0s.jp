import { Hono } from 'hono';
import Markdown from '../../../remark/dist/Markdown.js';
import { json as validatorJson } from '../validator/preview.ts';
import type { Preview } from '../../../@types/api.d.ts';

/**
 * 本文プレビュー
 */

export const previewApp = new Hono().post(validatorJson, async (context) => {
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
